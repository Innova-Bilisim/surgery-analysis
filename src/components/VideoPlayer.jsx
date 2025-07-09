'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const VideoPlayer = ({ 
  isLive = false, 
  videoSrc = '/videos/video01.mp4',
  currentTime, 
  totalTime, 
  onTimeUpdate, 
  className = "",
  cameraId = "1",
  streamUrl = null // For live HLS streams
}) => {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const cleanupRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting') // connecting, connected, disconnected
  const [streamQuality, setStreamQuality] = useState('auto')
  const [videojs, setVideojs] = useState(null)

  // Mark component as mounted
  useEffect(() => {
    setMounted(true)
    cleanupRef.current = false
    
    // Dynamically import Video.js only on client side
    const loadVideojs = async () => {
      try {
        const videojsModule = await import('video.js')
        const videojsDefault = videojsModule.default
        
        // Import CSS
        await import('video.js/dist/video-js.css')
        
        // Import HLS plugin
        await import('@videojs/http-streaming/dist/videojs-http-streaming.min.js')
        
        setVideojs(() => videojsDefault)
      } catch (error) {
        console.error('Failed to load Video.js:', error)
        setError('Failed to load video player library')
      }
    }

    loadVideojs()

    return () => {
      setMounted(false)
      cleanupRef.current = true
    }
  }, [])

  const getVideoSource = useCallback(() => {
    if (isLive && streamUrl) {
      return {
        src: streamUrl,
        type: streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'application/dash+xml'
      }
    }
    return {
      src: videoSrc,
      type: 'video/mp4'
    }
  }, [isLive, streamUrl, videoSrc])

  const getPlayerConfig = useCallback(() => {
    const source = getVideoSource()
    
    if (isLive) {
      // Live streaming configuration
      return {
        controls: true,
        responsive: true,
        fluid: false,
        preload: 'auto',
        autoplay: false,
        muted: false,
        volume: 0.8,
        liveui: true, // Enable live UI
        liveTracker: {
          trackingThreshold: 20,
          liveTolerance: 15
        },
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true,
            useDevicePixelRatio: true
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5], // Reduced rates for live
        fullscreen: {
          options: {
            navigationUI: 'hide'
          }
        },
        sources: [source]
      }
    } else {
      // File playback configuration
      return {
        controls: true,
        responsive: true,
        fluid: false,
        preload: 'auto',
        autoplay: false,
        muted: false,
        volume: 0.8,
        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2], // More rates for files
        fullscreen: {
          options: {
            navigationUI: 'hide'
          }
        },
        sources: [source]
      }
    }
  }, [isLive, getVideoSource])

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        console.log('Cleaning up player...')
        const player = playerRef.current
        
        // Remove all event listeners
        player.off()
        
        // Dispose player
        player.dispose()
        playerRef.current = null
      } catch (e) {
        console.warn('Error disposing player:', e)
        playerRef.current = null
      }
    }
    setIsReady(false)
    setConnectionStatus('connecting')
  }, [])

  const initializePlayer = useCallback(() => {
    // Don't initialize if component is being cleaned up or videojs not loaded
    if (cleanupRef.current || !mounted || !videojs) {
      return
    }

    const videoElement = videoRef.current
    const container = containerRef.current

    if (!videoElement || !container || playerRef.current) {
      return
    }

    // Ensure element is in DOM
    if (!document.body.contains(container)) {
      console.warn('Container element is not in DOM yet, waiting...')
      return
    }

    console.log(`Initializing Video.js player for ${isLive ? 'live streaming' : 'file playback'}...`)

    try {
      const config = getPlayerConfig()
      const player = videojs(videoElement, config)

      // Check if component was unmounted during initialization
      if (cleanupRef.current) {
        player.dispose()
        return
      }

      // Player ready
      player.ready(() => {
        // Double check component is still mounted
        if (cleanupRef.current) {
          player.dispose()
          return
        }

        console.log('Player is ready!')
        
        // Hide and disable fullscreen button
        const fullscreenToggle = player.controlBar?.fullscreenToggle
        if (fullscreenToggle) {
          fullscreenToggle.hide()
          fullscreenToggle.disable()
        }

        // Disable fullscreen functionality completely
        player.isFullscreen = () => false
        player.requestFullscreen = () => {
          console.log('Fullscreen disabled')
          return Promise.reject('Fullscreen is disabled')
        }
        player.exitFullscreen = () => {
          console.log('Fullscreen disabled')
          return Promise.reject('Fullscreen is disabled')
        }

        // Live stream specific setup
        if (isLive) {
          setConnectionStatus('connected')
          
          // Monitor stream health
          try {
            const tech = player.tech()
            if (tech && tech.vhs) {
              tech.vhs.on('usage', (event) => {
                console.log('VHS Usage:', event)
              })
            }
          } catch (e) {
            console.warn('VHS monitoring setup failed:', e)
          }
        }

        setIsReady(true)
        setError(null)
      })

      // Event listeners
      player.on('play', () => {
        if (cleanupRef.current) return
        console.log(`${isLive ? 'Live stream' : 'Video'} playing`)
        if (onTimeUpdate) onTimeUpdate(true)
      })

      player.on('pause', () => {
        if (cleanupRef.current) return
        console.log(`${isLive ? 'Live stream' : 'Video'} paused`)
        if (onTimeUpdate) onTimeUpdate(false)
      })

      player.on('error', (e) => {
        if (cleanupRef.current) return
        console.error('Player error:', e)
        const errorMsg = isLive ? 'Live stream connection error' : 'Video player error occurred'
        setError(errorMsg)
        if (isLive) setConnectionStatus('disconnected')
      })

      player.on('loadstart', () => {
        if (cleanupRef.current) return
        console.log(`${isLive ? 'Stream' : 'Video'} load started`)
        if (isLive) setConnectionStatus('connecting')
      })

      player.on('loadeddata', () => {
        if (cleanupRef.current) return
        console.log(`${isLive ? 'Stream' : 'Video'} data loaded`)
        if (isLive) setConnectionStatus('connected')
      })

      // Live streaming specific events
      if (isLive) {
        player.on('progress', () => {
          if (cleanupRef.current) return
          setConnectionStatus('connected')
        })

        player.on('waiting', () => {
          if (cleanupRef.current) return
          console.log('Stream buffering...')
          setConnectionStatus('connecting')
        })

        player.on('canplaythrough', () => {
          if (cleanupRef.current) return
          console.log('Stream ready to play')
          setConnectionStatus('connected')
        })
      }

      // Prevent fullscreen events
      player.on('fullscreenchange', (e) => {
        if (cleanupRef.current) return
        console.log('Fullscreen change prevented')
        e.preventDefault()
        e.stopPropagation()
        if (player.isFullscreen()) {
          player.exitFullscreen()
        }
      })

      // Prevent double-click fullscreen
      player.on('dblclick', (e) => {
        if (cleanupRef.current) return
        console.log('Double-click fullscreen prevented')
        e.preventDefault()
        e.stopPropagation()
      })

      playerRef.current = player

    } catch (error) {
      console.error('Failed to initialize player:', error)
      setError('Failed to initialize video player')
      if (isLive) setConnectionStatus('disconnected')
    }
  }, [isLive, getPlayerConfig, mounted, onTimeUpdate, cleanupRef, videojs])

  // Initialize player when component is mounted and DOM is ready and videojs is loaded
  useEffect(() => {
    if (!mounted || !videojs) return

    // Cleanup any existing player first
    cleanupPlayer()

    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (!cleanupRef.current) {
        initializePlayer()
      }
    }, 200) // Increased timeout for better stability

    return () => {
      clearTimeout(timer)
      cleanupPlayer()
    }
  }, [initializePlayer, cleanupPlayer, videojs])

  // Handle onTimeUpdate changes separately
  useEffect(() => {
    if (!playerRef.current || !onTimeUpdate || cleanupRef.current) return

    const handlePlay = () => {
      if (!cleanupRef.current) onTimeUpdate(true)
    }
    const handlePause = () => {
      if (!cleanupRef.current) onTimeUpdate(false)
    }
    
    // Remove existing listeners
    playerRef.current.off('play', handlePlay)
    playerRef.current.off('pause', handlePause)
    
    // Add new listeners
    playerRef.current.on('play', handlePlay)
    playerRef.current.on('pause', handlePause)

    return () => {
      if (playerRef.current && !cleanupRef.current) {
        playerRef.current.off('play', handlePlay)
        playerRef.current.off('pause', handlePause)
      }
    }
  }, [onTimeUpdate])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-emerald-400'
      case 'connecting': return 'text-amber-400'
      case 'disconnected': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢'
      case 'connecting': return '🟡'
      case 'disconnected': return '🔴'
      default: return '⚪'
    }
  }

  if (error) {
    return (
      <div ref={containerRef} className={`relative bg-red-900 rounded-xl overflow-hidden shadow-2xl h-full flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-8">
          <p className="text-xl mb-2 font-bold">⚠️ Video Player Error</p>
          <p className="text-sm mb-4 opacity-90">{error}</p>
          <button 
            onClick={() => {
              setError(null)
              setIsReady(false)
              setConnectionStatus('connecting')
              window.location.reload()
            }} 
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (!mounted || !videojs) {
    return (
      <div ref={containerRef} className={`relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl h-full flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium">{!videojs ? 'Loading Video.js...' : 'Initializing...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl h-full ${className}`}>
      {/* Camera info with live status */}
      <div className="absolute top-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium border border-blue-500/30">
        <div className="flex items-center gap-2">
          <span>Camera {cameraId}</span>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className={`text-xs ${getConnectionStatusColor()}`}>
                {getConnectionStatusIcon()} {connectionStatus.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live indicator */}
      {isLive && connectionStatus === 'connected' && (
        <div className="absolute top-4 right-4 z-10 bg-red-600/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          LIVE
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="video-js vjs-default-skin w-full h-full"
        controls
        preload="auto"
        width="100%"
        height="100%"
        data-setup="{}"
      >
        {getVideoSource().type === 'application/x-mpegURL' ? (
          <source src={getVideoSource().src} type="application/x-mpegURL" />
        ) : getVideoSource().type === 'application/dash+xml' ? (
          <source src={getVideoSource().src} type="application/dash+xml" />
        ) : (
          <source src={getVideoSource().src} type="video/mp4" />
        )}
        <p className="vjs-no-js">
          To view this video please enable JavaScript, and consider upgrading to a
          <a href="https://videojs.com/html5-video-support/" target="_blank" rel="noopener noreferrer">
            web browser that supports HTML5 video
          </a>.
        </p>
      </video>

      {/* Loading overlay */}
      {!isReady && !error && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-medium">
              {isLive ? `Connecting to live stream...` : 'Loading video...'}
            </p>
            {isLive && (
              <p className="text-xs text-gray-400 mt-2">Camera {cameraId}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer