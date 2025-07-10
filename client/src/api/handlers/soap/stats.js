import { esClient } from '../../../lib/esClient.js';

export async function statsHandler(req, res) {
  try {
    // Make API call to server-side stats endpoint
    const response = await fetch('/api/soap/stats', {
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
    console.error('Error in stats handler:', err);
    
    // Handle server errors
    if (err.message.includes('Server responded')) {
      console.warn('Server stats failed, returning fallback');
      return res.json({
        success: false,
        error: 'Elasticsearch index not found',
        stats: {
          total_docs: 0,
          store_size: 0,
          index_size: 0
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message 
    });
  }
} 