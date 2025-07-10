import { esClient } from '../../../lib/esClient.js';
import { getMongoClient } from '../../../lib/mongoClient.js';

export async function healthHandler(req, res) {
  try {
    // Make API call to server-side health endpoint
    const response = await fetch('/api/soap/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Error in health handler:', err);
    
    // Handle server errors
    if (err.message.includes('Server responded')) {
      console.warn('Server health check failed, returning fallback');
      return res.json({
        success: false,
        status: 'unhealthy',
        services: {
          elasticsearch: {
            status: 'unavailable',
            message: 'Server connection failed'
          }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message 
    });
  }
} 