'use client'

class MLModelService {
  constructor() {
    this.isRunning = false
    this.currentSession = null
    // Use environment variable with fallback
    const baseUrl = process.env.NEXT_PUBLIC_ML_MODEL_URL || 'http://10.10.10.210:13000'
    this.analyzeUrl = `${baseUrl}/analyze`
  }

  async startAnalysis(operationData) {
    if (this.isRunning) {
      console.warn('ML Model analysis already running')
      return { success: false, message: 'Analysis already in progress' }
    }

    try {
      console.log('Starting ML model analysis for operation:', operationData.id)
      
      // Video analizi için POST request
      const response = await fetch(this.analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoPath: '/home/arge/ai_surgical_project/videos/video01.mp4',
          operationId: operationData.id,
          operationType: operationData.type,
          room: operationData.room
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis service responded with status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.status === 'success') {
        this.isRunning = true
        this.currentSession = {
          sessionId: `session_${Date.now()}`,
          operationId: operationData.id,
          startTime: new Date().toISOString(),
          mqttTopic: result.mqtt_topic
        }

        console.log('ML model analysis started successfully:', result)
        console.log('MQTT topic for results:', result.mqtt_topic)
        
        return { 
          success: true, 
          sessionId: this.currentSession.sessionId,
          message: result.detail,
          mqttTopic: result.mqtt_topic
        }
      } else {
        throw new Error(result.detail || 'Analysis failed')
      }

    } catch (error) {
      console.error('Failed to start ML model analysis:', error)
      
      return { 
        success: false, 
        message: `Failed to start analysis: ${error.message}` 
      }
    }
  }



  async stopAnalysis() {
    if (!this.isRunning || !this.currentSession) {
      console.warn('No ML model analysis running')
      return { success: false, message: 'No analysis in progress' }
    }

    try {
      console.log('Stopping ML model analysis:', this.currentSession.sessionId)
      
      // Note: No stop endpoint provided, so we'll just reset local state
      this.isRunning = false
      this.currentSession = null
      
      return { 
        success: true, 
        message: 'Analysis session ended'
      }

    } catch (error) {
      console.error('Failed to stop ML model analysis:', error)
      
      // Force stop
      this.isRunning = false
      this.currentSession = null
      
      return { 
        success: true, 
        message: 'Analysis stopped (forced)' 
      }
    }
  }

  async getStatus() {
    return { 
      isRunning: this.isRunning, 
      session: this.currentSession 
    }
  }

  getCurrentSession() {
    return this.currentSession
  }

  isAnalysisRunning() {
    return this.isRunning
  }

  // Health check for analysis service
  async healthCheck() {
    try {
      // Simple connectivity test
      const response = await fetch(this.analyzeUrl.replace('/analyze', '/health'), {
        method: 'GET',
        timeout: 5000
      })

      return {
        available: response.ok,
        status: response.status,
        url: this.analyzeUrl
      }
    } catch (error) {
      return {
        available: false,
        error: error.message,
        url: this.analyzeUrl
      }
    }
  }
}

// Singleton instance
const mlModelService = new MLModelService()

export default mlModelService 