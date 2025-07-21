'use client'

import { useEffect, useCallback, useState } from 'react'
import mqttService from '@/services/mqttService'
import useOperationStore from '@/stores/operationStore'

// Tool names constant
const TOOL_NAMES = [
  "Grasper", "Bipolar", "Hook", "Scissors",
  "Clipper", "Irrigator", "SpecimenBag"
]

const PHASE_NAMES = [
  "Preparation", "CalotTriangleDissection", "ClippingCutting", "GallbladderDissection",
  "GallbladderPackaging", "CleaningCoagulation", "GallbladderRetraction"
]

const useMQTT = (enabled = true, activeModel = null) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [isEnabled, setIsEnabled] = useState(enabled) // MQTT enabled flag
  
  const { addEvent, setMqttConnected, currentOperation, setDetectedTools, detectedTools, updateStageStatus } = useOperationStore()

  // Single topic for all surgery analysis
  const SURGERY_STAGE_TOPIC = 'surgery/stage'
  const SURGERY_TOOL_TOPIC = 'surgery/tool'
  const SURGERY_STATUS_TOPIC = 'surgery/status'



  // Stage renk mappingi
  const getStageColor = useCallback((stageName) => {
    const stageColors = {
      "Preparation": "blue",
      "CalotTriangleDissection": "emerald", 
      "ClippingCutting": "purple",
      "GallbladderDissection": "amber",
      "GallbladderPackaging": "rose",
      "CleaningCoagulation": "orange",
      "GallbladderRetraction": "cyan"
    }
    return stageColors[stageName] || "gray"
  }, [])

  const handleConnectionChange = useCallback((data) => {
    const status = data.connected ? 'connected' : 'disconnected'
    setConnectionStatus(status)
    setMqttConnected(data.connected)
    setError(null)
    if (data.connected) {
      setRetryAttempts(0) // Reset retry attempts on successful connection
      const { setLastProcessedStage } = useOperationStore.getState()
      setLastProcessedStage(null)
    }
  }, [setMqttConnected])

  const handleError = useCallback((data) => {
    console.warn('MQTT connection error (non-blocking):', data.error)
    setError(data.error)
    setConnectionStatus('error')
    setMqttConnected(false)
    
    // After too many failures, disable MQTT temporarily
    const newRetryCount = retryAttempts + 1
    setRetryAttempts(newRetryCount)
    
    if (newRetryCount >= 3) {
      console.log('Disabling MQTT after multiple connection failures')
      setIsEnabled(false)
      setConnectionStatus('disabled')
      
      // Re-enable after 30 seconds for retry
      setTimeout(() => {
        console.log('Re-enabling MQTT for retry attempt')
        setIsEnabled(true)
        setRetryAttempts(0)
      }, 30000)
    }
  }, [setMqttConnected, retryAttempts])

  // surgery/stage topic handler - Geliştirilmiş stage handling
  const handleSurgeryStage = useCallback((message) => {
    try {
      if (message.surgery_type && message.file_name) return
      if (!message.begin) return
      
      const currentStage = message.stage
      const timestamp = message.begin
      
      if (!currentStage || typeof currentStage !== 'string') return
      
      // STORE'DAN SON STAGE'I AL - local state yerine
      const { stageProgress } = useOperationStore.getState()
      const lastProcessedStage = stageProgress?.lastProcessedStage
      
      if (lastProcessedStage === currentStage) {
        console.log(`🔄 Ignoring duplicate stage: ${currentStage}`)
        return
      }
      
      console.log(`✨ New surgery stage detected: ${lastProcessedStage || 'None'} → ${currentStage}`)
      
      // Store'a son işlenmiş stage'i kaydet
      const { setLastProcessedStage } = useOperationStore.getState()
      setLastProcessedStage(currentStage)
      
      // Stage ismini temizle ve anlamlı hale getir
      const cleanStageName = currentStage
        .replace(/_/g, ' ')
        .replace(/Stage$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, c => c.toUpperCase())
      
      // Event yaratma
      const event = {
        id: `surgery_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
        operationId: currentOperation?.id || null,
        timestamp: timestamp,
        type: 'stage_begin',
        description: `Started: ${cleanStageName}`,
        severity: 'high',
        source: 'mqtt',
        confidence: null,
        stage: currentStage,
        stageColor: getStageColor(currentStage),
        data: message
      }
      
      addEvent(event)
    } catch (error) {
      console.error('Error processing surgery analysis:', error)
    }
  }, [addEvent, currentOperation, getStageColor])

  // surgery/tool topic handler - Tool detection
  const handleSurgeryTools = useCallback((message) => {
    try {
      //console.log('Received tool detection:', message)
      
      const newTools = message.tool || []
      const timestamp = message.datetime
      
      // Validate incoming tools
      const validTools = newTools.filter(tool => TOOL_NAMES.includes(tool))
      
      console.log(`🔧 Tools detected: [${validTools.join(', ')}]`)
      
      // Get previous tools state before updating store
      const { detectedTools: prevTools } = useOperationStore.getState()
      
      // Tool kombinasyonu değişikliğini kontrol et - EN BAŞTA TANIMLA
      const toolsChanged = (
        validTools.length !== prevTools.length ||
        validTools.some(tool => !prevTools.includes(tool)) ||
        prevTools.some(tool => !validTools.includes(tool))
      )
      
      // Eğer hiçbir değişiklik yoksa, event yaratma ve erken çık
      if (!toolsChanged) {
        console.log('🔄 No tool changes detected, skipping event creation')
        return
      }
      
      // Update store with detected tools - SADECE DEĞİŞİKLİK VARSA
      setDetectedTools(validTools, timestamp)

      // Hangi tool'lar eklendi/çıkarıldı analizi
      const newlyDetected = validTools.filter(tool => !prevTools.includes(tool))
      const removed = prevTools.filter(tool => !validTools.includes(tool))
      
      // INDIVIDUAL TOOL EVENTS - Sadece 1-2 tool için spam yapmamak için
      // Tek seferde çok fazla tool değişikliği varsa grupla
      if (newlyDetected.length > 0 && newlyDetected.length <= 2) {
        const event = {
          id: `tool_detected_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'tool_detected',
          description: `Tool detected: ${newlyDetected.join(', ')}`,
          severity: 'medium',
          source: 'mqtt',
          confidence: null,
          data: { tools: newlyDetected, action: 'detected' }
        }
        addEvent(event)
      }
      
      if (removed.length > 0 && removed.length <= 2) {
        const event = {
          id: `tool_removed_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'tool_removed',
          description: `Tool removed: ${removed.join(', ')}`,
          severity: 'low',
          source: 'mqtt',
          confidence: null,
          data: { tools: removed, action: 'removed' }
        }
        addEvent(event)
      }
      
      // WORKFLOW STATE EVENTS - Anlamlı durum değişiklikleri
      const prevCount = prevTools.length
      const currentCount = validTools.length
      
      // Workflow başlangıcı: hiç tool yokken 1 tool algılandı
      if (prevCount === 0 && currentCount === 1) {
        const event = {
          id: `workflow_start_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_start',
          description: `Surgery workflow started: ${validTools[0]}`,
          severity: 'high',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'workflow_start', transition: 'none_to_single' }
        }
        addEvent(event)
      }
      
      // Workflow yoğun başlangıcı: hiç tool yokken direkt 2+ tool
      else if (prevCount === 0 && currentCount > 1) {
        const event = {
          id: `workflow_intense_start_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_intense_start',
          description: `Surgery started with multiple tools: ${validTools.join(', ')}`,
          severity: 'high',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'workflow_intense_start', transition: 'none_to_multiple' }
        }
        addEvent(event)
      }
      
      // Workflow yoğunlaşması: 1 tool'dan 2+ tool'a geçiş
      else if (prevCount === 1 && currentCount > 1) {
        const event = {
          id: `workflow_intensify_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_intensify',
          description: `Multiple tools active: ${validTools.join(', ')}`,
          severity: 'medium',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'workflow_intensify', transition: 'single_to_multiple' }
        }
        addEvent(event)
      }
      
      // Workflow odaklanması: 2+ tool'dan 1 tool'a geçiş
      else if (prevCount > 1 && currentCount === 1) {
        const event = {
          id: `workflow_focus_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_focus',
          description: `Workflow focused on: ${validTools[0]}`,
          severity: 'medium',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'workflow_focus', transition: 'multiple_to_single' }
        }
        addEvent(event)
      }
      
      // Workflow durması: 1+ tool'dan hiç tool'a geçiş
      else if (prevCount > 0 && currentCount === 0) {
        const event = {
          id: `workflow_pause_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_pause',
          description: `Surgery workflow paused`,
          severity: 'low',
          source: 'mqtt',
          confidence: null,
          data: { tools: [], action: 'workflow_pause', transition: 'active_to_none', lastTools: prevTools }
        }
        addEvent(event)
      }
      
      // Multiple tool değişikliği: 2+ tool'dan farklı 2+ tool'a
      else if (prevCount > 1 && currentCount > 1 && toolsChanged) {
        const event = {
          id: `workflow_shift_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'workflow_shift',
          description: `Tool combination changed: ${validTools.join(', ')}`,
          severity: 'medium',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'workflow_shift', transition: 'multiple_to_multiple', prevTools }
        }
        addEvent(event)
      }
      
      // SADECE TOOL DEĞİŞİKLİĞİ: Aynı sayıda ama farklı tool'lar (sadece 1 tool için)
      else if (currentCount === 1 && prevCount === 1 && toolsChanged) {
        const event = {
          id: `tool_switch_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'tool_switch',
          description: `Tool switched: ${prevTools[0]} → ${validTools[0]}`,
          severity: 'low',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'tool_switch', prevTools, transition: 'single_to_single' }
        }
        addEvent(event)
      }
      
    } catch (error) {
      console.error('Error processing tool detection:', error)
      console.error('Problematic message:', message)
    }
  }, [addEvent, currentOperation, setDetectedTools])

  // surgery/status topic handler - Stage progress status
  const handleSurgeryStatus = useCallback((message) => {
    try {
      const { stage, status, datetime, tool } = message
      
      console.log(`📊 Stage status update: ${stage} - ${status}`)
      
      // Clean stage name for better display
      const cleanStageName = stage
        .replace(/_/g, ' ')
        .replace(/Stage$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, c => c.toUpperCase())
      
      // Store'u güncelle - stage progress widget için
      updateStageStatus({
        currentStage: stage,
        cleanStageName,
        status: status,       // red/pink/green direkt backend'den kullan
        lastUpdate: datetime,
        activeTool: tool
      })
      
    } catch (error) {
      console.error('Error processing stage status:', error)
      console.error('Problematic message:', message)
    }
  }, [updateStageStatus])



  const connect = useCallback(async (brokerUrl = null) => {
    if (!isEnabled) {
      console.log('MQTT is disabled, skipping connection')
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)
      setRetryAttempts(prev => prev + 1)

      // Register event handlers
      mqttService.on('connect', handleConnectionChange)
      mqttService.on('disconnect', handleConnectionChange)
      mqttService.on('error', handleError)

      // Connect to MQTT broker - Use environment variable with fallback
      const defaultBrokerUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://10.10.10.210:9001'
      const finalBrokerUrl = brokerUrl || defaultBrokerUrl
      await mqttService.connect(finalBrokerUrl)
      
      // Subscribe to topics based on active model
      if (activeModel === 'stage-analysis') {
        mqttService.subscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
        mqttService.subscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ - Her iki model için de
        console.log('Subscribed to surgery/stage and surgery/status topics')
      } else if (activeModel === 'tool-detection') {
        mqttService.subscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
        mqttService.subscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ - Her iki model için de
        console.log('Subscribed to surgery/tool and surgery/status topics')
      }

      //console.log('MQTT connected and subscribed to surgery topics')
      
    } catch (error) {
      console.warn('MQTT connection failed (non-blocking):', error.message)
      // Don't throw the error, just log it
    }
  }, [isEnabled, activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools, handleSurgeryStatus])

  const disconnect = useCallback(() => {
    // Conditional unsubscribe
    if (activeModel === 'stage-analysis') {
      mqttService.unsubscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
      mqttService.unsubscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
    } else if (activeModel === 'tool-detection') {
      mqttService.unsubscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
      mqttService.unsubscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
    }

    // Remove event handlers
    mqttService.off('connect', handleConnectionChange)
    mqttService.off('disconnect', handleConnectionChange)
    mqttService.off('error', handleError)

    // Disconnect
    mqttService.disconnect()
    
    setConnectionStatus('disconnected')
    setMqttConnected(false)
    setError(null)
  }, [activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools, handleSurgeryStatus, setMqttConnected])

  const publish = useCallback((topic, message) => {
    if (!isEnabled) return false
    return mqttService.publish(topic, message)
  }, [isEnabled])

  // Update enabled state when prop changes
  useEffect(() => {
    setIsEnabled(enabled)
  }, [enabled])

  // Auto-connect when MQTT is enabled
  useEffect(() => {
    if (!isEnabled) {
      return
    }

    let isActive = true

    const connectToMQTT = async () => {
      try {
        setConnectionStatus('connecting')
        setError(null)

        // Register event handlers
        mqttService.on('connect', handleConnectionChange)
        mqttService.on('disconnect', handleConnectionChange)
        mqttService.on('error', handleError)

        // Connect to MQTT broker with timeout - Use environment variable
        const brokerUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://10.10.10.210:9001'
        const connectPromise = mqttService.connect(brokerUrl)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 15000) // Increased timeout for WebSocket
        })

        await Promise.race([connectPromise, timeoutPromise])
        
        if (!isActive) return // Component unmounted during connection
        
        // Subscribe to topics based on active model
        if (activeModel === 'stage-analysis') {
          mqttService.subscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
          mqttService.subscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
          console.log('Subscribed to surgery/stage and surgery/status topics')
        } else if (activeModel === 'tool-detection') {
          mqttService.subscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
          mqttService.subscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
          console.log('Subscribed to surgery/tool and surgery/status topics')
        }

        //console.log('MQTT connected and subscribed to surgery topics')
        
      } catch (error) {
        if (!isActive) return // Component unmounted during connection
        
        console.warn('MQTT connection failed (non-blocking):', error.message)
        setError(error.message)
        setConnectionStatus('error')
        setMqttConnected(false)
        
        // Don't retry too aggressively
        setRetryAttempts(prev => prev + 1)
      }
    }

    connectToMQTT()

    return () => {
      isActive = false
      
      // Cleanup - conditional unsubscribe
      if (activeModel === 'stage-analysis') {
        mqttService.unsubscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
        mqttService.unsubscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
      } else if (activeModel === 'tool-detection') {
        mqttService.unsubscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
        mqttService.unsubscribe(SURGERY_STATUS_TOPIC, handleSurgeryStatus) // YENİ
      }
      
      // Remove event handlers
      mqttService.off('connect', handleConnectionChange)
      mqttService.off('disconnect', handleConnectionChange)
      mqttService.off('error', handleError)

      // Disconnect
      mqttService.disconnect()
      
      setConnectionStatus('disconnected')
      setMqttConnected(false)
      setError(null)
    }
  }, [isEnabled, activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools, handleSurgeryStatus, setMqttConnected])

  return {
    connectionStatus,
    error,
    connect,
    disconnect,
    publish,
    isConnected: connectionStatus === 'connected',
    isEnabled,
    retryAttempts
  }
}

export default useMQTT 