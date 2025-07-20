'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useOperationStore from '@/stores/operationStore'
import { mockOperations, mockEvents } from '@/data/mockData'

const useOperation = () => {
  const router = useRouter()
  
  const { 
    currentOperation, 
    events,
    setCurrentOperation, 
    setEvents,
    clearEvents,
    resetAll 
  } = useOperationStore()

  // Load operation by ID
  const loadOperation = useCallback((operationId) => {
    if (!operationId) {
      console.warn('No operation ID provided')
      return null
    }

    const operation = mockOperations.find(op => op.id === operationId)
    
    if (!operation) {
      console.error(`Operation not found: ${operationId}`)
      return null
    }

    console.log('Loading operation:', operation)
    
    // Set current operation
    setCurrentOperation(operation)
    
    // Clear events - real events will come from MQTT
    clearEvents()
    
    return operation
  }, [setCurrentOperation, clearEvents])

  // Navigate to operation analysis
  const navigateToOperation = useCallback((operationId) => {
    if (!operationId) {
      console.error('Operation ID is required for navigation')
      return
    }
    
    console.log('Navigating to operation:', operationId)
    router.push(`/analysis/${operationId}`)
  }, [router])

  // Clear current operation and return to home
  const exitOperation = useCallback(() => {
    console.log('Exiting current operation')
    resetAll()
    router.push('/')
  }, [resetAll, router])

  // Get operations for a specific date
  const getOperationsForDate = useCallback((date) => {
    if (!date) return []
    
    return mockOperations.filter(op => {
      const opDate = new Date(op.scheduledTime)
      return opDate.toDateString() === date.toDateString()
    })
  }, [])

  // Get all operations
  const getAllOperations = useCallback(() => {
    return mockOperations
  }, [])

  // Get operation by ID (without setting as current)
  const getOperationById = useCallback((operationId) => {
    return mockOperations.find(op => op.id === operationId) || null
  }, [])

  // Update operation status (for demo purposes)
  const updateOperationStatus = useCallback((operationId, newStatus) => {
    // In a real app, this would make an API call
    console.log(`Updating operation ${operationId} status to: ${newStatus}`)
    
    // Update current operation if it matches
    if (currentOperation && currentOperation.id === operationId) {
      const updatedOperation = {
        ...currentOperation,
        status: newStatus
      }
      setCurrentOperation(updatedOperation)
    }
    
    // Add status change event
    const statusEvent = {
      id: `status_${Date.now()}`,
      operationId: operationId,
      timestamp: new Date().toISOString(),
      type: 'status',
      description: `Operation status changed to: ${newStatus}`,
      severity: 'low',
      source: 'system'
    }
    
    useOperationStore.getState().addEvent(statusEvent)
  }, [currentOperation, setCurrentOperation])

  // Get events for current operation
  const getCurrentOperationEvents = useCallback(() => {
    if (!currentOperation) return []
    
    return events.filter(event => event.operationId === currentOperation.id)
  }, [currentOperation, events])

  // Format time helpers
  const formatTime = useCallback((dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }, [])

  // Operation status helpers
  const isOperationInProgress = useCallback((operation = currentOperation) => {
    return operation?.status === 'in-progress'
  }, [currentOperation])

  const isOperationScheduled = useCallback((operation = currentOperation) => {
    return operation?.status === 'scheduled'
  }, [currentOperation])

  const isOperationCompleted = useCallback((operation = currentOperation) => {
    return operation?.status === 'completed'
  }, [currentOperation])

  // Get operation status color for UI
  const getOperationStatusColor = useCallback((status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700'
      case 'in-progress': return 'bg-amber-100 text-amber-700'
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }, [])

  // Get operation status text
  const getOperationStatusText = useCallback((status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'in-progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }, [])

  return {
    // Current state
    currentOperation,
    events: getCurrentOperationEvents(),
    
    // Actions
    loadOperation,
    navigateToOperation,
    exitOperation,
    updateOperationStatus,
    
    // Data getters
    getAllOperations,
    getOperationById,
    getOperationsForDate,
    
    // Status helpers
    isOperationInProgress,
    isOperationScheduled,
    isOperationCompleted,
    getOperationStatusColor,
    getOperationStatusText,
    
    // Format helpers
    formatTime,
    formatDate
  }
}

export default useOperation 