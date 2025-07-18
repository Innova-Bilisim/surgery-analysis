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
    totalTime: '02:45:30',
    
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set((state) => ({ currentTime: typeof time === 'function' ? time(state.currentTime) : time })), // Destek: fonksiyon veya string
    setTotalTime: (time) => set({ totalTime: time }),
    
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
      events: [],
      isModelActive: false,
      modelStartTime: null,
      mqttConnected: false,
      analysisStatus: 'idle'
    })
  }))
)

export default useOperationStore 