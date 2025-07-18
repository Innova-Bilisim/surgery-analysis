/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker deployment için standalone output
  output: 'standalone',
  
  // Production optimizasyonları
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: [],
    unoptimized: false,
  },
  
  // Environment variables for client-side
  env: {
    // These will be available in the browser
    NEXT_PUBLIC_ML_MODEL_URL: process.env.NEXT_PUBLIC_ML_MODEL_URL || 'http://10.10.10.210:13000',
    NEXT_PUBLIC_MQTT_WS_URL: process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://10.10.10.210:9001',
    NEXT_PUBLIC_VIDEO_BASE_PATH: process.env.NEXT_PUBLIC_VIDEO_BASE_PATH || '/videos',
    NEXT_PUBLIC_DEFAULT_VIDEO: process.env.NEXT_PUBLIC_DEFAULT_VIDEO || 'video01.mp4',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        videojs: {
          name: 'videojs',
          test: /[\\/]node_modules[\\/](video\.js)[\\/]/,
          chunks: 'all',
          priority: 30,
        },
      }
    }
    
    return config
  },
}

export default nextConfig;
