'use client'

import { useEffect, useCallback, useState } from 'react'
import mqttService from '@/services/mqttService'
import useOperationStore from '@/stores/operationStore'

const useMQTT = (enabled = true) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [isEnabled, setIsEnabled] = useState(enabled) // MQTT enabled flag
  
  const { addEvent, setMqttConnected, currentOperation } = useOperationStore()

  // Single topic for all surgery analysis
  const SURGERY_STAGE_TOPIC = 'surgery/stage'

  const handleConnectionChange = useCallback((data) => {
    const status = data.connected ? 'connected' : 'disconnected'
    setConnectionStatus(status)
    setMqttConnected(data.connected)
    setError(null)
    if (data.connected) {
      setRetryAttempts(0) // Reset retry attempts on successful connection
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



    // surgery/stage topic handler - Simple timestamp + event format
  const handleSurgeryStage = useCallback((message) => {
    try {
      console.log('Received surgery analysis:', message)
      
      // Expected format: { timestamp, event }
      const event = {
        id: `surgery_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`,
        operationId: currentOperation?.id || null,
        timestamp: message.timestamp || new Date().toISOString(),
        type: 'analysis',
        description: message.event || 'Surgery event detected',
        severity: 'medium',
        source: 'mqtt',
        confidence: null,
        stage: null,
        data: message
      }
      
      addEvent(event)
    } catch (error) {
      console.error('Error processing surgery analysis:', error)
    }
  }, [addEvent, currentOperation])



  const connect = useCallback(async (brokerUrl = 'ws://10.10.10.210:9001') => {
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

      // Connect to MQTT broker - Always use production server
      const brokerUrl = 'ws://10.10.10.210:9001'
      await mqttService.connect(brokerUrl)
      
      // Subscribe to single topic
      mqttService.subscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)

      console.log('MQTT connected and subscribed to surgery/stage topic')
      
    } catch (error) {
      console.warn('MQTT connection failed (non-blocking):', error.message)
      // Don't throw the error, just log it
    }
  }, [isEnabled, handleConnectionChange, handleError, handleSurgeryStage, retryAttempts])

  const disconnect = useCallback(() => {
    // Unsubscribe from topic
    mqttService.unsubscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)

    // Remove event handlers
    mqttService.off('connect', handleConnectionChange)
    mqttService.off('disconnect', handleConnectionChange)
    mqttService.off('error', handleError)

    // Disconnect
    mqttService.disconnect()
    
    setConnectionStatus('disconnected')
    setMqttConnected(false)
    setError(null)
  }, [handleConnectionChange, handleError, handleSurgeryStage, setMqttConnected])

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

        // Connect to MQTT broker with timeout - Always use production server
        const brokerUrl = 'ws://10.10.10.210:9001'
        const connectPromise = mqttService.connect(brokerUrl)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 15000) // Increased timeout for WebSocket
        })

        await Promise.race([connectPromise, timeoutPromise])
        
        if (!isActive) return // Component unmounted during connection
        
        // Subscribe to single topic
        mqttService.subscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)

        console.log('MQTT connected and subscribed to surgery/stage topic')
        
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
      
      // Cleanup - unsubscribe and disconnect
      mqttService.unsubscribe(SURGERY_STAGE_TOPIC, handleSurgeryStage)
      
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
  }, [isEnabled, handleConnectionChange, handleError, handleSurgeryStage, setMqttConnected])

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