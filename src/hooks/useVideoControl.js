'use client'

import { useEffect, useCallback } from 'react'
import useOperationStore from '@/stores/operationStore'

const useVideoControl = () => {
  const { 
    isPlaying, 
    currentTime, 
    setIsPlaying, 
    setCurrentTime
  } = useOperationStore()

  // Handle video play state change - sadece state güncellemesi
  const handlePlayStateChange = useCallback((playing) => {
    setIsPlaying(playing)
  }, [setIsPlaying])

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

  return {
    // State
    isPlaying,
    currentTime,
    
    // Actions
    handlePlayStateChange,
    handleTimeUpdate
  }
}

export default useVideoControl 