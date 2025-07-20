'use client'

class MLModelService {
  constructor() {
    this.isRunning = false
    this.currentSession = null
    // Use environment variable with fallback
    const baseUrl = process.env.NEXT_PUBLIC_ML_MODEL_URL || 'http://10.10.10.210:8000'
    this.baseUrl = baseUrl
    this.analyzeToolUrl = `${baseUrl}/analyze_tool`
    this.analyzePhaseUrl = `${baseUrl}/analyze_phase`
  }



  async startToolDetection(operationData) {
    if (this.isRunning) {
      console.warn('ML Model analysis already running')
      return { success: false, message: 'Analysis already in progress' }
    }
  
    try {
      const vidId = 1 // Sabit video ID
      console.log('Starting Tool Detection analysis for operation:', operationData.id, 'with vid_id:', vidId)
      
      // Tool Detection analizi için POST request (body yok)
      const response = await fetch(`${this.analyzeToolUrl}/${vidId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
  
      if (!response.ok) {
        throw new Error(`Tool Detection service responded with status: ${response.status}`)
      }
  
      const result = await response.json()
      
      // Backend'den gelen format: {"job_id": "d44faafe", "state": "pending"}
      if (result.job_id) {
        this.isRunning = true
        this.currentSession = {
          sessionId: result.job_id,  // Backend'den gelen job_id'yi kullan
          operationId: operationData.id,
          modelType: 'tool-detection',
          startTime: new Date().toISOString(),
          vidId: vidId,
          state: result.state
        }
  
        console.log('Tool Detection analysis started successfully:', result)
        
        return { 
          success: true, 
          sessionId: this.currentSession.sessionId,
          message: `Tool detection started with job ID: ${result.job_id}`,
          jobId: result.job_id,
          state: result.state,
          modelType: 'tool-detection'
        }
      } else {
        throw new Error('Failed to get job_id from response')
      }
  
    } catch (error) {
      console.error('Failed to start Tool Detection analysis:', error)
      
      return { 
        success: false, 
        message: `Failed to start tool detection: ${error.message}` 
      }
    }
  }
  
  async startStageAnalysis(operationData) {
    if (this.isRunning) {
      console.warn('ML Model analysis already running')
      return { success: false, message: 'Analysis already in progress' }
    }
  
    try {
      const vidId = 1 // Sabit video ID
      console.log('Starting Stage Analysis for operation:', operationData.id, 'with vid_id:', vidId)
      
      // Stage Analysis için POST request (body yok)
      const response = await fetch(`${this.analyzePhaseUrl}/${vidId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
  
      if (!response.ok) {
        throw new Error(`Stage Analysis service responded with status: ${response.status}`)
      }
  
      const result = await response.json()
      
      // Backend'den gelen format: {"job_id": "d44faafe", "state": "pending"}
      if (result.job_id) {
        this.isRunning = true
        this.currentSession = {
          sessionId: result.job_id,  // Backend'den gelen job_id'yi kullan
          operationId: operationData.id,
          modelType: 'stage-analysis',
          startTime: new Date().toISOString(),
          vidId: vidId,
          state: result.state
        }
  
        console.log('Stage Analysis started successfully:', result)
        
        return { 
          success: true, 
          sessionId: this.currentSession.sessionId,
          message: `Stage analysis started with job ID: ${result.job_id}`,
          jobId: result.job_id,
          state: result.state,
          modelType: 'stage-analysis'
        }
      } else {
        throw new Error('Failed to get job_id from response')
      }
  
    } catch (error) {
      console.error('Failed to start Stage Analysis:', error)
      
      return { 
        success: false, 
        message: `Failed to start stage analysis: ${error.message}` 
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


}

// Singleton instance
const mlModelService = new MLModelService()

export default mlModelService 