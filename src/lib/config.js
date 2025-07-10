import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/vet-cares',
  ES_URL: process.env.ES_URL || 'http://localhost:9200',
  ES_INDEX: process.env.ES_INDEX || 'soap_notes',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  // Add more as needed
}; 