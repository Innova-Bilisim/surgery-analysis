'use client'

import { useEffect, useCallback } from 'react'
import useOperationStore from '@/stores/operationStore'

const useVideoControl = () => {
  const { 
    isPlaying, 
    currentTime, 
    totalTime,
    videoDuration,
    setIsPlaying, 
    setCurrentTime,
    setVideoDuration
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

  // Real time update from video player
  const handleRealTimeUpdate = useCallback((timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600)
    const minutes = Math.floor((timeInSeconds % 3600) / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    //console.log('🕐 Hook: Updating current time to:', formattedTime)
    setCurrentTime(formattedTime)
  }, [setCurrentTime])

  return {
    // State
    isPlaying,
    currentTime,
    totalTime,
    videoDuration,
    
    // Actions
    handlePlayStateChange,
    handleTimeUpdate,
    handleRealTimeUpdate,
    setVideoDuration
  }
}

export default useVideoControl 