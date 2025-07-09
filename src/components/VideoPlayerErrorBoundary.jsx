'use client'

import React from 'react'

class VideoPlayerErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Video Player Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Force a complete re-render with a new key
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative bg-red-900 rounded-xl overflow-hidden shadow-2xl h-full flex items-center justify-center">
          <div className="text-white text-center p-8">
            <p className="text-xl mb-2 font-bold">⚠️ Video Player Error</p>
            <p className="text-sm mb-4 opacity-90">
              The video player encountered an error and needs to be restarted.
            </p>
            <div className="bg-red-800/50 rounded p-3 mb-4 text-xs text-left">
              <p className="font-semibold mb-1">Error:</p>
              <p className="text-red-200">{this.state.error && this.state.error.toString()}</p>
            </div>
            <button 
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors duration-200"
            >
              Restart Player
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default VideoPlayerErrorBoundary