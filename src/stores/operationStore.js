'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const useOperationStore = create(
  subscribeWithSelector((set, get) => ({
    // Operation State
    currentOperation: null,
    setCurrentOperation: (operation) => set({ currentOperation: operation }),
    
    // Video State
    isPlaying: false,
    currentTime: '00:00:00',
    totalTime: '00:00:00',
    videoDuration: 0, // Video duration in seconds
    shouldAutoPlay: false, // Video auto-play kontrolü
    externalPlayControl: null, // External play/pause control (true/false/null)
    
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set((state) => ({ currentTime: typeof time === 'function' ? time(state.currentTime) : time })), // Destek: fonksiyon veya string
    setTotalTime: (time) => set({ totalTime: time }),
    setVideoDuration: (duration) => {
      const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      
      console.log('🏪 Store: Setting video duration to:', duration, 'seconds')
      set({ 
        videoDuration: duration,
        totalTime: formatTime(duration)
      })
    },
    setShouldAutoPlay: (autoplay) => set({ shouldAutoPlay: autoplay }),
    setExternalPlayControl: (control) => set({ externalPlayControl: control }),
    
    // Events State
    events: [],
    addEvent: (event) => set((state) => ({ 
      events: [event, ...state.events] 
    })),
    setEvents: (events) => set({ events }),
    clearEvents: () => set({ events: [] }),
    
    // ML Model State
    isModelActive: false,
    modelStartTime: null,
    setModelActive: (active) => set({ 
      isModelActive: active,
      modelStartTime: active ? new Date().toISOString() : null
    }),
    
    // MQTT Connection State
    mqttConnected: false,
    setMqttConnected: (connected) => set({ mqttConnected: connected }),
    
    // Analysis State
    analysisStatus: 'idle', // idle, starting, running, stopped
    setAnalysisStatus: (status) => set({ analysisStatus: status }),
    
    // Actions
    resetAll: () => set({
      currentOperation: null,
      isPlaying: false,
      currentTime: '00:00:00',
      totalTime: '02:45:30',
      shouldAutoPlay: false,
      externalPlayControl: null,
      events: [],
      isModelActive: false,
      modelStartTime: null,
      mqttConnected: false,
      analysisStatus: 'idle'
    })
  }))
)

export default useOperationStore 