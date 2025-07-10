import { esClient } from '../../../lib/esClient.js';
import { getMongoClient } from '../../../lib/mongoClient.js';

export async function healthHandler(req, res) {
  try {
    // Check Elasticsearch health
    const esHealth = await esClient.cluster.health();
    
    // Check MongoDB health
    const mongoClient = await getMongoClient();
    await mongoClient.db('vet-cares').admin().ping();
    
    res.status(200).json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      elasticsearch: {
        status: esHealth.status,
        cluster_name: esHealth.cluster_name
      },
      mongodb: {
        status: 'connected'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 