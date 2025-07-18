'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const VideoPlayer = ({ 
  isLive = false, 
  videoSrc = null, // Will use environment variables for default
  currentTime, 
  totalTime, 
  onTimeUpdate, 
  onDurationUpdate, // New prop for duration updates
  className = "",
  cameraId = "1",
  streamUrl = null, // For live HLS streams
  shouldAutoPlay = false, // External control for autoplay
  externalPlayControl = null // External play/pause control from parent
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
  // Mount state for DOM readiness
  const [isDOMReady, setIsDOMReady] = useState(false)
  
  // External play control effect
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    
    const player = playerRef.current
    
    if (externalPlayControl === true && player.paused()) {
      player.play().catch(e => {
        console.log('External play failed:', e.message)
      })
    } else if (externalPlayControl === false && !player.paused()) {
      player.pause()
    }
  }, [externalPlayControl, isReady])

  // DOM readiness effect
  useEffect(() => {
    if (!mounted) return
    
    let retryCount = 0
    const maxRetries = 20
    
    const checkDOMReady = () => {
      const videoEl = videoRef.current
      const containerEl = containerRef.current
      const videoReady = videoEl && videoEl.parentNode && videoEl.isConnected
      const containerReady = containerEl && containerEl.isConnected
      
      if (videoReady && containerReady) {
        setIsDOMReady(true)
        return true
      }
      
      // Retry if not ready yet
      retryCount++
      if (retryCount < maxRetries) {
        setTimeout(() => {
          checkDOMReady()
        }, 200)
      } else {
        // Force DOM ready after max retries
        setIsDOMReady(true)
      }
      
      return false
    }
    
    // Check immediately
    checkDOMReady()
    
    return () => {
      retryCount = maxRetries // Stop retries on unmount
    }
  }, [mounted])

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
        console.error('🎬 Failed to load Video.js:', error)
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
    
    // Use environment variables for video path
    const videoBasePath = process.env.NEXT_PUBLIC_VIDEO_BASE_PATH || '/videos'
    const defaultVideo = process.env.NEXT_PUBLIC_DEFAULT_VIDEO || 'video01.mp4'
    const finalVideoSrc = videoSrc || `${videoBasePath}/${defaultVideo}`
    
    return {
      src: finalVideoSrc,
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
        preload: 'metadata', // Changed from 'auto' - fixes loading issues
        autoplay: false,
        muted: false,
        volume: 0.8,
        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2], // More rates for files
        fullscreen: {
          options: {
            navigationUI: 'hide'
          }
        },
        html5: {
          // Add HTML5 video options for better compatibility
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        sources: [source]
      }
    }
  }, [isLive, getVideoSource])

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
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

  // Initialize player with proper DOM checks
  const initializePlayer = useCallback(async () => {
    if (cleanupRef.current || !mounted || !videojs || !isDOMReady) {
      return
    }
    
    // Ensure video element exists and is in DOM
    if (!videoRef.current || !videoRef.current.parentNode || !videoRef.current.isConnected) {
      return
    }
    
    // Additional container check
    if (!containerRef.current || !containerRef.current.isConnected) {
      return
    }

    try {
      const config = getPlayerConfig()
      
      const player = videojs(videoRef.current, config, function onPlayerReady() {
        if (cleanupRef.current) return
        
        setIsReady(true)
        setError(null)

        // Video.js best practice: ensure player is truly ready
        this.ready(() => {
          // Load the video source explicitly
          if (config.sources && config.sources.length > 0) {
            this.src(config.sources)
          }
        })

        // Add safer event handling to prevent DOM targeting errors
        try {
          // Disable Video.js default behaviors that cause DOM issues
          this.off('useractive')
          this.off('userinactive')
          
          // Custom user activity handling to prevent DOM errors
          let userActivityTimer = null
          const handleUserActivity = () => {
            if (cleanupRef.current) return
            this.trigger('useractive')
            if (userActivityTimer) clearTimeout(userActivityTimer)
            userActivityTimer = setTimeout(() => {
              if (!cleanupRef.current && this.el()) {
                this.trigger('userinactive')
              }
            }, 3000)
          }
          
          // Add safer mouse/touch event listeners
          if (this.el()) {
            this.el().addEventListener('mousemove', handleUserActivity, { passive: true })
            this.el().addEventListener('touchstart', handleUserActivity, { passive: true })
          }

          // Auto-play video
          if (!isLive && shouldAutoPlay) {
            // Small delay to ensure everything is loaded
            setTimeout(() => {
              if (!cleanupRef.current && this.readyState() >= 1) {
                this.play().catch(e => {
                  console.log('Auto-play prevented:', e.message)
                })
              }
            }, 500)
          }
        } catch (error) {
          console.warn('Player event setup warning:', error)
        }
      })

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
        console.log(`🎬 ${isLive ? 'Live stream' : 'Video'} playing`)
        if (onTimeUpdate) onTimeUpdate(true)
      })

      player.on('pause', () => {
        if (cleanupRef.current) return
        console.log(`🎬 ${isLive ? 'Live stream' : 'Video'} paused`)
        if (onTimeUpdate) onTimeUpdate(false)
      })

      player.on('timeupdate', () => {
        if (cleanupRef.current) return
        const currentTimeSeconds = player.currentTime()
        if (onDurationUpdate && typeof onDurationUpdate === 'function') {
          // Send current time to parent - we'll reuse onDurationUpdate for time updates
          if (currentTimeSeconds >= 0) {
            onDurationUpdate(currentTimeSeconds, 'timeupdate')
          }
        }
      })

      player.on('error', (e) => {
        if (cleanupRef.current) return
        console.error('🎬 Player error:', e)
        const player = e.target
        if (player && player.error()) {
          console.error('🎬 Player error details:', player.error())
        }
        const errorMsg = isLive ? 'Live stream connection error' : 'Video player error occurred'
        setError(errorMsg)
        if (isLive) setConnectionStatus('disconnected')
      })

      player.on('loadstart', () => {
        if (cleanupRef.current) return
        console.log(`🎬 ${isLive ? 'Stream' : 'Video'} load started`)
        if (isLive) setConnectionStatus('connecting')
      })

      player.on('loadeddata', () => {
        if (cleanupRef.current) return
        console.log(`🎬 ${isLive ? 'Stream' : 'Video'} data loaded`)
        if (isLive) setConnectionStatus('connected')
      })

      player.on('canplay', () => {
        if (cleanupRef.current) return
        console.log('🎬 Video can start playing')
      })

      player.on('canplaythrough', function() {
        if (cleanupRef.current) return
        console.log('🎬 Video can play through without stopping')
        setIsReady(true) // Ensure ready state is set when video is playable
        
        // Auto-play işlemini burada da dene
        if (shouldAutoPlay && !isLive) {
          const currentPlayer = this // Video.js player context
          setTimeout(() => {
            if (!cleanupRef.current && currentPlayer.paused()) {
              currentPlayer.play().catch(e => {
                console.log('Auto-play from canplaythrough failed:', e.message)
              })
            }
          }, 500)
        }
      })

      player.on('loadedmetadata', () => {
        if (cleanupRef.current) return
        console.log('🎬 Video metadata loaded')
        
        // Send duration to parent component
        if (onDurationUpdate && player.duration && player.duration() > 0) {
          const duration = player.duration()
          console.log('🎬 Video duration:', duration, 'seconds')
          onDurationUpdate(duration, 'duration')
        }
      })

      player.on('durationchange', () => {
        if (cleanupRef.current) return
        const duration = player.duration()
        console.log('🎬 Video duration available:', duration)
        
        // Send duration to parent component
        if (onDurationUpdate && duration > 0) {
          console.log('🎬 Sending duration to parent:', duration, 'seconds')
          onDurationUpdate(duration, 'duration')
        }
      })

      player.on('progress', () => {
        if (cleanupRef.current) return
        const buffered = player.buffered()
        if (buffered.length > 0) {
          console.log('🎬 Video buffering progress:', buffered.end(buffered.length - 1))
        }
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
  }, [isLive, getPlayerConfig, mounted, onTimeUpdate, cleanupRef, videojs, isDOMReady])

  // Initialize player when component is mounted and DOM is ready and videojs is loaded
  useEffect(() => {
    if (!mounted || !videojs || !isDOMReady) return

    // Cleanup any existing player first
    cleanupPlayer()

    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(async () => {
      if (!cleanupRef.current) {
        await initializePlayer()
      }
    }, 300) // Reduced timeout since we now have better DOM checks

    return () => {
      clearTimeout(timer)
      cleanupPlayer()
    }
  }, [initializePlayer, cleanupPlayer, videojs, isDOMReady]) // Added isDOMReady dependency

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