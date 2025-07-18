'use client'

import { useEffect, useCallback } from 'react'
import useOperationStore from '@/stores/operationStore'
import mlModelService from '@/services/mlModelService'

const useVideoControl = () => {
  const { 
    isPlaying, 
    currentTime, 
    currentOperation,
    setIsPlaying, 
    setCurrentTime,
    setModelActive,
    isModelActive
  } = useOperationStore()

  // Debug log kaldırıldı (gerek kalmadı)

  // Handle video play state change
  const handlePlayStateChange = useCallback(async (playing) => {
    const wasPlaying = isPlaying
    setIsPlaying(playing)

    // Trigger ML model when video starts playing
    if (playing && !wasPlaying && currentOperation && !isModelActive) {
      try {
        console.log('Video started playing, triggering ML model analysis...')
        
        const result = await mlModelService.startAnalysis(currentOperation)
        
        if (result.success) {
          setModelActive(true)
          console.log('ML model analysis started successfully:', result.sessionId)
          
          // Add start event to store
          const startEvent = {
            id: `model_start_${Date.now()}`,
            operationId: currentOperation.id,
            timestamp: new Date().toISOString(),
            type: 'start',
            description: `ML analysis started - Session: ${result.sessionId}`,
            severity: 'low',
            source: 'system'
          }
          
          // We'll add this through the store directly
          useOperationStore.getState().addEvent(startEvent)
        } else {
          console.error('Failed to start ML model:', result.message)
          
          // Add error event
          const errorEvent = {
            id: `model_error_${Date.now()}`,
            operationId: currentOperation.id,
            timestamp: new Date().toISOString(),
            type: 'error',
            description: `Failed to start ML analysis: ${result.message}`,
            severity: 'high',
            source: 'system'
          }
          
          useOperationStore.getState().addEvent(errorEvent)
        }
      } catch (error) {
        console.error('Error starting ML model:', error)
        
        const errorEvent = {
          id: `model_error_${Date.now()}`,
          operationId: currentOperation.id,
          timestamp: new Date().toISOString(),
          type: 'error',
          description: `ML model error: ${error.message}`,
          severity: 'high',
          source: 'system'
        }
        
        useOperationStore.getState().addEvent(errorEvent)
      }
    }

    // Stop ML model when video is paused/stopped
    if (!playing && wasPlaying && isModelActive) {
      try {
        console.log('Video paused/stopped, stopping ML model analysis...')
        
        const result = await mlModelService.stopAnalysis()
        
        if (result.success) {
          setModelActive(false)
          console.log('ML model analysis stopped successfully')
          
          // Add stop event
          const stopEvent = {
            id: `model_stop_${Date.now()}`,
            operationId: currentOperation.id,
            timestamp: new Date().toISOString(),
            type: 'stop',
            description: 'ML analysis stopped',
            severity: 'low',
            source: 'system'
          }
          
          useOperationStore.getState().addEvent(stopEvent)
        } else {
          console.error('Failed to stop ML model:', result.message)
        }
      } catch (error) {
        console.error('Error stopping ML model:', error)
      }
    }
  }, [isPlaying, currentOperation, isModelActive, setIsPlaying, setModelActive])

  // Handle time updates
  const handleTimeUpdate = useCallback((time) => {
    if (typeof time === 'string') {
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  // Simulate time progression when playing (for demo purposes)
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const [hours, minutes, seconds] = prev.split(':').map(Number)
        const totalSeconds = hours * 3600 + minutes * 60 + seconds + 1
        
        // Prevent overflow
        if (totalSeconds >= 9999) return prev
        
        const newHours = Math.floor(totalSeconds / 3600)
        const newMinutes = Math.floor((totalSeconds % 3600) / 60)
        const newSecs = totalSeconds % 60
        
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, setCurrentTime])

  // Cleanup ML model on unmount or operation change
  useEffect(() => {
    return () => {
      if (isModelActive) {
        mlModelService.stopAnalysis().catch(console.error)
      }
    }
  }, [isModelActive])

  // Monitor ML model status
  const getModelStatus = useCallback(async () => {
    try {
      return await mlModelService.getStatus()
    } catch (error) {
      console.error('Error getting ML model status:', error)
      return { isRunning: false, error: error.message }
    }
  }, [])

  // Force stop ML model
  const forceStopModel = useCallback(async () => {
    try {
      const result = await mlModelService.stopAnalysis()
      if (result.success) {
        setModelActive(false)
      }
      return result
    } catch (error) {
      console.error('Error force stopping ML model:', error)
      return { success: false, message: error.message }
    }
  }, [setModelActive])

  // Health check ML service
  const checkModelHealth = useCallback(async () => {
    try {
      return await mlModelService.healthCheck()
    } catch (error) {
      console.error('Error checking ML model health:', error)
      return { available: false, error: error.message }
    }
  }, [])

  return {
    // State
    isPlaying,
    currentTime,
    isModelActive,
    
    // Actions
    handlePlayStateChange,
    handleTimeUpdate,
    
    // ML Model controls
    getModelStatus,
    forceStopModel,
    checkModelHealth
  }
}

export default useVideoControl 