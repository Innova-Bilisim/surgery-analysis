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
  const [lastStage, setLastStage] = useState(null) // Son stage'i sakla
  
  const { addEvent, setMqttConnected, currentOperation, setDetectedTools, detectedTools } = useOperationStore()

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
      setLastStage(null) // Reset last stage on new connection
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
      console.log('Received surgery analysis:', message)
      
      // Surgery type mesajını ignore et
      if (message.surgery_type && message.file_name) {
        console.log('📋 Surgery info received:', message.surgery_type, message.file_name)
        return
      }
      
      // SADECE BEGIN MESAJLARINI KABUL ET
      if (!message.begin) {
        console.log('⏭️ Ignoring non-begin message')
        return
      }
      
      const currentStage = message.stage
      const timestamp = message.begin
      
      // currentStage kontrolü
      if (!currentStage || typeof currentStage !== 'string') {
        console.log('⚠️ No valid stage found in begin message:', message)
        return
      }
      
      // Eğer aynı stage ise, event ekleme
      if (lastStage === currentStage) {
        console.log(`🔄 Ignoring duplicate stage: ${currentStage}`)
        return
      }
      
      // Yeni stage - event ekle
      console.log(`✨ New surgery stage detected: ${lastStage || 'None'} → ${currentStage}`)
      setLastStage(currentStage)
      
      // Stage ismini temizle ve anlamlı hale getir
      const cleanStageName = currentStage
        .replace(/_/g, ' ')
        .replace(/Stage$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, c => c.toUpperCase())
      
      // Sadece stage begin event'i oluştur
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
      console.error('Problematic message:', message)
    }
  }, [addEvent, currentOperation, lastStage, getStageColor])

  // surgery/tool topic handler - Tool detection
  const handleSurgeryTools = useCallback((message) => {
    try {
      console.log('Received tool detection:', message)
      
      const newTools = message.tool || []
      const timestamp = message.datetime
      
      // Validate incoming tools
      const validTools = newTools.filter(tool => TOOL_NAMES.includes(tool))
      
      console.log(`🔧 Tools detected: [${validTools.join(', ')}]`)
      
      // Update store with detected tools
      setDetectedTools(validTools, timestamp)

      const { detectedTools: prevTools } = useOperationStore.getState()

      // Check for significant changes to create events
      // const prevTools = detectedTools || []
      const newlyDetected = validTools.filter(tool => !prevTools.includes(tool))
      const removed = prevTools.filter(tool => !validTools.includes(tool))
      
      // Create events for significant changes
      if (newlyDetected.length > 0) {
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
      
      if (removed.length > 0) {
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
      
      // Special events
      if (validTools.length === 0 && prevTools.length > 0) {
        const event = {
          id: `tools_inactive_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'tools_inactive',
          description: 'All tools inactive',
          severity: 'low',
          source: 'mqtt',
          confidence: null,
          data: { tools: [], action: 'all_inactive' }
        }
        addEvent(event)
      }
      
      if (validTools.length > 1) {
        const event = {
          id: `multiple_tools_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
          operationId: currentOperation?.id || null,
          timestamp: timestamp || new Date().toISOString(),
          type: 'multiple_tools',
          description: `Multiple tools active: ${validTools.join(', ')}`,
          severity: 'medium',
          source: 'mqtt',
          confidence: null,
          data: { tools: validTools, action: 'multiple_active' }
        }
        addEvent(event)
      }
      
    } catch (error) {
      console.error('Error processing tool detection:', error)
      console.error('Problematic message:', message)
    }
  }, [addEvent, currentOperation, setDetectedTools])



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
      
      // Subscribe to topics
      // Subscribe to topics based on active model
      if (activeModel === 'stage-analysis') {
        mqttService.subscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
        console.log('Subscribed to surgery/stage topic')
      } else if (activeModel === 'tool-detection') {
        mqttService.subscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
        console.log('Subscribed to surgery/tool topic')
      }

      console.log('MQTT connected and subscribed to surgery topics')
      
    } catch (error) {
      console.warn('MQTT connection failed (non-blocking):', error.message)
      // Don't throw the error, just log it
    }
  }, [isEnabled, activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools])

  const disconnect = useCallback(() => {
    // Conditional unsubscribe
    if (activeModel === 'stage-analysis') {
      mqttService.unsubscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
    } else if (activeModel === 'tool-detection') {
      mqttService.unsubscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
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
  }, [activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools, setMqttConnected])

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
          console.log('Subscribed to surgery/stage topic')
        } else if (activeModel === 'tool-detection') {
          mqttService.subscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
          console.log('Subscribed to surgery/tool topic')
        }

        console.log('MQTT connected and subscribed to surgery topics')
        
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
      } else if (activeModel === 'tool-detection') {
        mqttService.unsubscribe(SURGERY_TOOL_TOPIC, handleSurgeryTools)
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
  }, [isEnabled, activeModel, handleConnectionChange, handleError, handleSurgeryStage, handleSurgeryTools, setMqttConnected])

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