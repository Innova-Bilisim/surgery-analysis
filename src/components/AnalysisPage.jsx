'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, Clock, User, UserCheck, Activity, AlertCircle } from 'lucide-react'
import { mockOperations, mockEvents } from '@/data/mockData'
import VideoPlayer from '@/components/VideoPlayer'
import VideoPlayerErrorBoundary from '@/components/VideoPlayerErrorBoundary'

const AnalysisPage = ({ operationId }) => {
  const router = useRouter()
  const [operation, setOperation] = useState(null)
  const [events, setEvents] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [totalTime] = useState('02:45:30')

  useEffect(() => {
    if (operationId) {
      const foundOperation = mockOperations.find(op => op.id === operationId)
      setOperation(foundOperation || null)
      
      // Filter events for this operation
      const operationEvents = mockEvents.filter(event => event.operationId === operationId)
      setEvents(operationEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    }
  }, [operationId])

  useEffect(() => {
    // Simulate real-time events
    const interval = setInterval(() => {
      if (operation && operation.status === 'in-progress') {
        const newEvent = {
          id: `ev${Date.now()}`,
          operationId: operation.id,
          timestamp: new Date().toISOString(),
          type: ['monitoring', 'medication'][Math.floor(Math.random() * 2)],
          description: [
            'Vital signs monitored - Normal',
            'Blood pressure: 125/82 mmHg',
            'Heart rate: 72 BPM',
            'Oxygen saturation: 98%',
            'Temperature: 36.5°C'
          ][Math.floor(Math.random() * 5)],
          severity: 'low'
        }
        
        setEvents(prev => [newEvent, ...prev])
      }
    }, 15000) // Add new event every 15 seconds

    return () => clearInterval(interval)
  }, [operation])

  useEffect(() => {
    // Simulate video time progression
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const [hours, minutes, seconds] = prev.split(':').map(Number)
          const totalSeconds = hours * 3600 + minutes * 60 + seconds + 1
          const newHours = Math.floor(totalSeconds / 3600)
          const newMinutes = Math.floor((totalSeconds % 3600) / 60)
          const newSecs = totalSeconds % 60
          return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`
        })
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  const formatEventTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'start': return <Play className="w-5 h-5 text-emerald-400" />
      case 'monitoring': return <Activity className="w-5 h-5 text-primary-400" />
      case 'medication': return <AlertCircle className="w-5 h-5 text-amber-400" />
      case 'incision': return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'suture': return <AlertCircle className="w-5 h-5 text-red-400" />
      default: return <Activity className="w-5 h-5 text-primary-400" />
    }
  }

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'high': return 'border-l-red-500 bg-red-500/10'
      case 'medium': return 'border-l-amber-500 bg-amber-500/10'
      case 'low': return 'border-l-emerald-500 bg-emerald-500/10'
      default: return 'border-l-emerald-500 bg-emerald-500/10'
    }
  }

  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-amber-400'
      case 'low': return 'text-emerald-400'
      default: return 'text-emerald-400'
    }
  }

  if (!operation) {
    return (
      <div className="h-screen bg-dark-900 text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-light text-dark-400 mb-8">Operation not found</h2>
        <button 
          onClick={() => router.push('/')} 
          className="flex items-center gap-2 bg-primary-600/20 border border-primary-600/30 text-primary-400 px-6 py-3 rounded-lg hover:bg-primary-600/30 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" /> Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-dark-900 text-white overflow-hidden flex flex-col">
      {/* Operation Info Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-dark-900/95 backdrop-blur-sm border-b border-primary-500/20 flex-shrink-0">
        <button 
          onClick={() => router.push('/')} 
          className="flex items-center gap-2 bg-primary-600/20 border border-primary-600/30 text-primary-400 px-4 py-3 rounded-lg hover:bg-primary-600/30 transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1 mx-8">
          <h2 className="text-xl font-semibold text-white mb-2">{operation.type}</h2>
          <div className="flex items-center gap-8 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-dark-400" />
              <span>{operation.patient.name} ({operation.patient.age} yrs)</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-dark-400" />
              <span>Dr. {operation.doctor.name}</span>
            </div>
            <div className="text-dark-300">
              Room {operation.room}
            </div>
            <div>
              <span className={`
                px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                ${operation.status === 'in-progress' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}
              `}>
                {operation.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 font-semibold text-primary-400">
          <Clock className="w-5 h-5" />
          <span>{currentTime} / {totalTime}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] flex-1 min-h-0 overflow-hidden">
        {/* Video Section */}
        <div className="p-8 flex flex-col overflow-hidden">
          <VideoPlayerErrorBoundary>
            <VideoPlayer 
              isLive={false} // Video file playback mode
              videoSrc="/videos/video01.mp4"
              currentTime={currentTime}
              totalTime={totalTime}
              onTimeUpdate={setIsPlaying}
              cameraId={operation.room}
              className="flex-1"
            />
          </VideoPlayerErrorBoundary>
        </div>

        {/* Events Section */}
        <div className="bg-dark-800 border-l border-primary-500/20 flex flex-col min-h-0">
          <div className="px-6 py-6 border-b border-primary-500/20 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-semibold text-white">Operation Events</h3>
            <div className="bg-primary-600/20 text-primary-400 px-3 py-1 rounded-xl text-xs font-semibold">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-3 min-h-0">
            {events.map(event => (
              <div 
                key={event.id} 
                className={`
                  bg-dark-800/50 border-l-4 p-4 rounded-r-lg transition-all duration-200 hover:bg-dark-800/80 hover:translate-x-1
                  ${getSeverityStyles(event.severity)}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  {getEventIcon(event.type)}
                  <span className="text-xs text-dark-400 font-medium">{formatEventTime(event.timestamp)}</span>
                </div>
                <div className="text-white text-sm leading-relaxed mb-2">
                  {event.description}
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${getSeverityTextColor(event.severity)}`}>
                  {event.severity === 'high' ? 'High' : 
                   event.severity === 'medium' ? 'Medium' : 'Low'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisPage