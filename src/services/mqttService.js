'use client'

import mqtt from 'mqtt'

class MqttService {
  constructor() {
    this.client = null
    this.isConnected = false
    this.callbacks = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 3 // Reduced from 5
    this.isQuiet = false // Flag to reduce logging
  }

  connect(brokerUrl = 'ws://10.10.10.210:9001', options = {}) {
    if (this.client && this.isConnected) {
      console.log('MQTT already connected')
      return Promise.resolve()
    }

    // Create a stable client ID based on session
    const sessionId = sessionStorage.getItem('mqtt_session_id') || 
      Math.random().toString(16).substr(2, 12)
    if (!sessionStorage.getItem('mqtt_session_id')) {
      sessionStorage.setItem('mqtt_session_id', sessionId)
    }

    const defaultOptions = {
      clientId: `surgery_web_${sessionId}`,
      keepalive: 30, // Reduced for WebSocket
      connectTimeout: 10000, // Increased for WebSocket MQTT
      reconnectPeriod: 5000, // Increased reconnect period
      clean: true,
      protocolVersion: 4, // MQTT 3.1.1
      rejectUnauthorized: false, // For WebSocket connections
      ...options
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.isQuiet) {
          console.log('Attempting MQTT WebSocket connection to:', brokerUrl)
          console.log('Connection options:', defaultOptions)
        }
        this.client = mqtt.connect(brokerUrl, defaultOptions)

        this.client.on('connect', () => {
          if (!this.isQuiet) {
            console.log('MQTT connected successfully')
          }
          this.isConnected = true
          this.reconnectAttempts = 0
          this.isQuiet = false // Reset quiet mode on successful connection
          this.notifyCallbacks('connect', { connected: true })
          resolve()
        })

        this.client.on('error', (error) => {
          this.isConnected = false
          
          // Only log first few errors to avoid spam
          if (this.reconnectAttempts <= 2) {
            console.warn('MQTT connection error:', error.message)
          }
          
          this.notifyCallbacks('error', { error: error.message })
          
          if (this.reconnectAttempts === 0) {
            reject(error)
          }
        })

        this.client.on('close', () => {
          if (!this.isQuiet && this.isConnected) {
            console.log('MQTT connection closed')
          }
          this.isConnected = false
          this.notifyCallbacks('disconnect', { connected: false })
        })

        this.client.on('reconnect', () => {
          this.reconnectAttempts++
          
          if (this.reconnectAttempts <= 2) {
            console.log(`MQTT reconnecting... (attempt ${this.reconnectAttempts})`)
          }
          
          if (this.reconnectAttempts > this.maxReconnectAttempts) {
            if (!this.isQuiet) {
              console.log('Max MQTT reconnection attempts reached, going quiet')
            }
            this.isQuiet = true
            this.client.end()
            this.notifyCallbacks('error', { error: 'Max reconnection attempts reached' })
          }
        })

        this.client.on('message', (topic, message) => {
          try {
            const messageStr = message.toString()
            if (!this.isQuiet) {
              console.log('MQTT message received:', { topic, message: messageStr })
            }
            
            // Parse JSON message
            const parsedMessage = JSON.parse(messageStr)
            this.notifyCallbacks('message', { topic, message: parsedMessage })
          } catch (error) {
            if (!this.isQuiet) {
              console.error('Error parsing MQTT message:', error)
            }
            this.notifyCallbacks('error', { error: 'Failed to parse message' })
          }
        })

      } catch (error) {
        console.error('Failed to create MQTT client:', error)
        reject(error)
      }
    })
  }

  subscribe(topic, callback) {
    if (!this.client || !this.isConnected) {
      if (!this.isQuiet) {
        console.warn('MQTT not connected, cannot subscribe to:', topic)
      }
      return false
    }

    this.client.subscribe(topic, (error) => {
      if (error) {
        if (!this.isQuiet) {
          console.error('MQTT subscription error:', error)
        }
        return
      }
      if (!this.isQuiet) {
        console.log(`MQTT subscribed to topic: ${topic}`)
      }
    })

    // Store callback for this topic
    if (!this.callbacks.has(topic)) {
      this.callbacks.set(topic, new Set())
    }
    this.callbacks.get(topic).add(callback)
    
    return true
  }

  unsubscribe(topic, callback) {
    if (!this.client) return

    // Remove callback
    if (this.callbacks.has(topic)) {
      this.callbacks.get(topic).delete(callback)
      
      // If no more callbacks for this topic, unsubscribe
      if (this.callbacks.get(topic).size === 0) {
        this.client.unsubscribe(topic)
        this.callbacks.delete(topic)
        if (!this.isQuiet) {
          console.log(`MQTT unsubscribed from topic: ${topic}`)
        }
      }
    }
  }

  publish(topic, message) {
    if (!this.client || !this.isConnected) {
      if (!this.isQuiet) {
        console.warn('MQTT not connected, cannot publish to:', topic)
      }
      return false
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message)
    
    this.client.publish(topic, messageStr, (error) => {
      if (error) {
        if (!this.isQuiet) {
          console.error('MQTT publish error:', error)
        }
      } else if (!this.isQuiet) {
        console.log(`MQTT message published to ${topic}:`, message)
      }
    })
    
    return true
  }

  // General event listener
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set())
    }
    this.callbacks.get(event).add(callback)
  }

  off(event, callback) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).delete(callback)
    }
  }

  notifyCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          if (!this.isQuiet) {
            console.error('Error in MQTT callback:', error)
          }
        }
      })
    }

    // Also notify message callbacks for specific topics
    if (event === 'message' && data.topic) {
      if (this.callbacks.has(data.topic)) {
        this.callbacks.get(data.topic).forEach(callback => {
          try {
            callback(data.message)
          } catch (error) {
            if (!this.isQuiet) {
              console.error('Error in MQTT topic callback:', error)
            }
          }
        })
      }
    }
  }

  disconnect() {
    if (this.client) {
      if (!this.isQuiet) {
        console.log('Disconnecting MQTT client')
      }
      this.client.end()
      this.client = null
      this.isConnected = false
      this.callbacks.clear()
      this.reconnectAttempts = 0
      this.isQuiet = false
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      clientId: this.client?.options?.clientId || null,
      quiet: this.isQuiet
    }
  }
}

// Singleton instance
const mqttService = new MqttService()

export default mqttService 