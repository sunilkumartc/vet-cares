// Production Configuration
export const productionConfig = {
  // Application
  NODE_ENV: 'production',
  PORT: process.env.PORT || 3001,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/vet-cares',
  ES_URL: process.env.ES_URL || 'http://localhost:9200',
  ES_INDEX: process.env.ES_INDEX || 'soap_notes',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  
  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // External Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME || '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
}; 