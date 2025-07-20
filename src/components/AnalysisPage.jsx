'use client'

import { useEffect, useCallback } from 'react'
import { ArrowLeft, Clock, User, UserCheck, Activity, AlertCircle, Play, Wrench, List } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import VideoPlayerErrorBoundary from '@/components/VideoPlayerErrorBoundary'
import useOperation from '@/hooks/useOperation'
import useVideoControl from '@/hooks/useVideoControl'
import useMQTT from '@/hooks/useMQTT'
import useOperationStore from '@/stores/operationStore'
import mlModelService from '@/services/mlModelService'

const AnalysisPage = ({ operationId }) => {
  // Custom hooks for business logic
  const { 
    currentOperation, 
    events, 
    loadOperation, 
    exitOperation 
  } = useOperation()
  
  const { 
    isPlaying, 
    currentTime, 
    totalTime,
    handlePlayStateChange, 
    handleRealTimeUpdate,
    isModelActive,
    setVideoDuration
  } = useVideoControl()
  
  // Store state
  const { 
    analysisStatus, 
    activeModel,
    detectedTools,
    toolsLastUpdate,
    setAnalysisStatus, 
    setActiveModel,
    setModelActive,
    shouldAutoPlay,
    externalPlayControl,
    setShouldAutoPlay,
    setExternalPlayControl
  } = useOperationStore()
  
  // MQTT connection hook - only when analysis is running
  const { 
    connectionStatus: mqttStatus, 
    isConnected: mqttConnected 
  } = useMQTT(analysisStatus === 'running', activeModel)

  // Tool names constant
  const TOOL_NAMES = [
    "Grasper", "Bipolar", "Hook", "Scissors",
    "Clipper", "Irrigator", "SpecimenBag"
  ]


  // Load operation on component mount
  useEffect(() => {
    if (operationId) {
      loadOperation(operationId)
    }
  }, [operationId, loadOperation])

  // Handle video duration and time updates
  const handleVideoUpdate = useCallback((value, type) => {
    if (type === 'timeupdate') {
      // Handle time updates (sol taraf - geçen zaman)
      console.log('⏱️ Time update:', value, 'seconds')
      handleRealTimeUpdate(value)
    } else {
      // Handle duration updates (sağ taraf - toplam süre)
      console.log('📏 Duration update:', value, 'seconds')
      setVideoDuration(value)
    }
  }, [handleRealTimeUpdate, setVideoDuration])



  // Start tool detection analysis
  const startToolDetection = async () => {
    if (!currentOperation) return

    try {
      setAnalysisStatus('starting')
      setActiveModel('tool-detection')
      setModelActive(true)

      // Start Tool Detection ML model
      const result = await mlModelService.startToolDetection(currentOperation)
      
      if (result.success) {
        console.log('Tool detection started successfully:', result.message)
        setAnalysisStatus('running')
        
        // Video'yu otomatik başlat
        setShouldAutoPlay(true)
        
        setTimeout(() => {
          setExternalPlayControl(true)
          handlePlayStateChange(true)
        }, 3000)
        
      } else {
        throw new Error(result.message || 'Failed to start tool detection')
      }
    } catch (error) {
      console.error('Failed to start tool detection:', error)
      setAnalysisStatus('idle')
      setActiveModel(null)
      setModelActive(false)
    }
  }

  // Start stage analysis
  const startStageAnalysis = async () => {
    if (!currentOperation) return

    try {
      setAnalysisStatus('starting')
      setActiveModel('stage-analysis')
      setModelActive(true)

      // Start Stage Analysis ML model
      const result = await mlModelService.startStageAnalysis(currentOperation)
      
      if (result.success) {
        console.log('Stage analysis started successfully:', result.message)
        setAnalysisStatus('running')
        
        // Video'yu otomatik başlat
        setShouldAutoPlay(true)
        
        setTimeout(() => {
          setExternalPlayControl(true)
          handlePlayStateChange(true)
        }, 3000)
        
      } else {
        throw new Error(result.message || 'Failed to start stage analysis')
      }
    } catch (error) {
      console.error('Failed to start stage analysis:', error)
      setAnalysisStatus('idle')
      setActiveModel(null)
      setModelActive(false)
    }
  }

  // Stop analysis function
  const stopAnalysis = async () => {
    try {
      // Video'yu durdur
      setExternalPlayControl(false)
      handlePlayStateChange(false)
      
      // State'leri temizle
      setAnalysisStatus('idle')
      setActiveModel(null)
      setModelActive(false)
      setShouldAutoPlay(false)
      setExternalPlayControl(null)
      
      await mlModelService.stopAnalysis()
    } catch (error) {
      console.error('Failed to stop analysis:', error)
    }
  }

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

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
    return `${Math.floor(diffSecs / 3600)}h ago`
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'start': return <Play className="w-5 h-5 text-emerald-400" />
      case 'monitoring': return <Activity className="w-5 h-5 text-primary-400" />
      case 'medication': return <AlertCircle className="w-5 h-5 text-amber-400" />
      case 'incision': return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'suture': return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'tool_detected': return <Wrench className="w-5 h-5 text-blue-400" />
      case 'tool_removed': return <Wrench className="w-5 h-5 text-gray-400" />
      case 'tools_inactive': return <Wrench className="w-5 h-5 text-red-400" />
      case 'multiple_tools': return <Wrench className="w-5 h-5 text-emerald-400" />
      case 'stage_begin': return <List className="w-5 h-5 text-emerald-400" />
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

  const getStageStyles = (event) => {
    if (event.type !== 'stage_begin' || !event.stageColor) {
      return getSeverityStyles(event.severity)
    }
    
    const colorMap = {
      blue: 'border-l-blue-500 bg-blue-500/10',
      emerald: 'border-l-emerald-500 bg-emerald-500/10',
      purple: 'border-l-purple-500 bg-purple-500/10',
      amber: 'border-l-amber-500 bg-amber-500/10',
      rose: 'border-l-rose-500 bg-rose-500/10',
      orange: 'border-l-orange-500 bg-orange-500/10',
      cyan: 'border-l-cyan-500 bg-cyan-500/10',
      gray: 'border-l-gray-500 bg-gray-500/10'
    }
    
    return colorMap[event.stageColor] || colorMap.gray
  }
  
  const getStageTextColor = (event) => {
    if (event.type !== 'stage_begin' || !event.stageColor) {
      return getSeverityTextColor(event.severity)
    }
    
    const colorMap = {
      blue: 'text-blue-400',
      emerald: 'text-emerald-400', 
      purple: 'text-purple-400',
      amber: 'text-amber-400',
      rose: 'text-rose-400',
      orange: 'text-orange-400',
      cyan: 'text-cyan-400',
      gray: 'text-gray-400'
    }
    
    return colorMap[event.stageColor] || colorMap.gray
  }

  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-amber-400'
      case 'low': return 'text-emerald-400'
      default: return 'text-emerald-400'
    }
  }

  if (!currentOperation) {
    return (
      <div className="h-screen bg-dark-900 text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-light text-dark-400 mb-8">Operation not found</h2>
        <button 
          onClick={exitOperation} 
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
          onClick={exitOperation} 
          className="flex items-center gap-2 bg-primary-600/20 border border-primary-600/30 text-primary-400 px-4 py-3 rounded-lg hover:bg-primary-600/30 transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1 mx-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-xl font-semibold text-white">{currentOperation.type}</h2>
            {analysisStatus === 'starting' && (
              <span className="bg-amber-600/20 text-amber-400 px-2 py-1 rounded-md text-xs font-semibold border border-amber-600/30">
                STARTING...
              </span>
            )}
            {analysisStatus === 'running' && (
              <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                activeModel === 'tool-detection' 
                  ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' 
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
              }`}>
                {activeModel === 'tool-detection' ? 'TOOL DETECTION' : 'STAGE ANALYSIS'}
              </span>
            )}
            {mqttConnected && (
              <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-md text-xs font-semibold border border-blue-600/30">
                MQTT CONNECTED
              </span>
            )}
          </div>
          <div className="flex items-center gap-8 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-dark-400" />
              <span>{currentOperation.patient.name} ({currentOperation.patient.age} yrs)</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-dark-400" />
              <span>Dr. {currentOperation.doctor.name}</span>
            </div>
            <div className="text-dark-300">
              Room {currentOperation.room}
            </div>
            <div>
              <span className={`
                px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                ${currentOperation.status === 'in-progress' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}
              `}>
                {currentOperation.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 font-semibold text-primary-400">
          <Clock className="w-5 h-5" />
          <span>{currentTime} / {totalTime || '00:00:00'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] flex-1 min-h-0 overflow-hidden">
        {/* Video Section */}
        <div className="p-8 flex flex-col overflow-hidden">
          {analysisStatus === 'idle' ? (
            // Start Analysis Screen
            <div className="flex-1 flex flex-col items-center justify-center bg-dark-800 rounded-xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-white mb-4">Surgery Analysis</h3>
                <p className="text-dark-300 mb-8">Choose analysis model to start AI-powered surgery monitoring</p>
                <div className="flex gap-6">
                  <button
                    onClick={startToolDetection}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-3"
                  >
                    <Wrench className="w-6 h-6" />
                    Tool Detection
                  </button>
                  <button
                    onClick={startStageAnalysis}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-3"
                  >
                    <List className="w-6 h-6" />
                    Stage Analysis
                  </button>
                </div>
              </div>
            </div>
          ) : analysisStatus === 'starting' ? (
            // Loading Screen
            <div className="flex-1 flex flex-col items-center justify-center bg-dark-800 rounded-xl">
              <div className="text-center">
                <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
                  activeModel === 'tool-detection' ? 'border-blue-500' : 'border-emerald-500'
                }`}></div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Starting {activeModel === 'tool-detection' ? 'Tool Detection' : 'Stage Analysis'}...
                </h3>
                <p className="text-dark-300">Initializing ML model and connecting to systems</p>
              </div>
            </div>
          ) : (
            // Video Player (Running State)
            <VideoPlayerErrorBoundary>
              <VideoPlayer 
                isLive={false}
                videoSrc="/videos/video01.mp4"
                currentTime={currentTime}
                totalTime={totalTime}
                onTimeUpdate={handlePlayStateChange}
                onDurationUpdate={handleVideoUpdate}
                cameraId={currentOperation.room}
                className="flex-1"
                shouldAutoPlay={shouldAutoPlay}
                externalPlayControl={externalPlayControl}
              />
            </VideoPlayerErrorBoundary>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-dark-800 border-l border-primary-500/20 flex flex-col min-h-0">
          <div className="px-6 py-6 border-b border-primary-500/20 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-semibold text-white">Operation Events</h3>
            <div className="flex items-center gap-3">
              <div className="bg-primary-600/20 text-primary-400 px-3 py-1 rounded-xl text-xs font-semibold">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </div>
              {mqttConnected && (
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              )}
              {analysisStatus === 'running' && (
                <button
                  onClick={stopAnalysis}
                  className="bg-red-600/20 border border-red-600/30 text-red-400 px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-600/30 transition-all duration-200"
                >
                  Stop Analysis
                </button>
              )}
            </div>
          </div>

          {/* Tool Detection Widget - Only show when Tool Detection is active */}
          {activeModel === 'tool-detection' && analysisStatus === 'running' && (
            <div className="px-6 py-4 border-b border-primary-500/20 bg-dark-900/50">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">DETECTED TOOLS</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {TOOL_NAMES.map(tool => (
                    <div
                      key={tool}
                      className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                        detectedTools.includes(tool)
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        detectedTools.includes(tool) ? 'bg-emerald-400' : 'bg-dark-500'
                      }`}></div>
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-dark-400 text-right">
                Last update: {formatLastUpdate(toolsLastUpdate)}
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-3 min-h-0">
            {analysisStatus === 'idle' ? (
              <div className="text-center text-dark-400 py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No analysis running</p>
                <p className="text-sm mt-2">Start analysis to see real-time surgery events</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center text-dark-400 py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Waiting for events...</p>
                <p className="text-sm mt-2">MQTT connected, listening for surgery analysis</p>
              </div>
            ) : (
              events.map(event => (
              <div 
                key={event.id} 
                className={`
                  bg-dark-800/50 border-l-4 p-4 rounded-r-lg transition-all duration-200 hover:bg-dark-800/80 hover:translate-x-1
                  ${getStageStyles(event)}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.type)}
                    {event.source && (
                      <span className={`
                        text-xs px-2 py-1 rounded-md font-semibold
                        ${event.source === 'mqtt' ? 'bg-blue-600/20 text-blue-400' :
                          event.source === 'ml' ? 'bg-emerald-600/20 text-emerald-400' :
                          'bg-gray-600/20 text-gray-400'}
                      `}>
                        {event.source.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-dark-400 font-medium">{formatEventTime(event.timestamp)}</span>
                </div>
                <div className="text-white text-sm leading-relaxed mb-2">
                  {event.description}
                </div>
                <div className="flex justify-between items-center">
                  <div className={`text-xs font-semibold uppercase tracking-wide ${getStageTextColor(event)}`}>
                    {event.severity === 'high' ? 'High' : 
                     event.severity === 'medium' ? 'Medium' : 'Low'}
                  </div>
                  {event.confidence && (
                    <div className="text-xs text-dark-400">
                      Confidence: {Math.round(event.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisPage