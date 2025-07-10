import { esClient } from '../../../lib/esClient.js';

export async function statsHandler(req, res) {
  try {
    // Get Elasticsearch index statistics
    const stats = await esClient.indices.stats({ index: 'soap_notes' });
    
    if (!stats.indices['soap_notes']) {
      return res.status(404).json({
        success: false,
        error: 'Elasticsearch index not found'
      });
    }

    const indexStats = stats.indices['soap_notes'];
    
    res.json({
      success: true,
      stats: {
        totalDocs: indexStats.total?.docs?.count || 0,
        indexSize: indexStats.total?.store?.size_in_bytes || 0,
        fieldStats: indexStats.total?.fielddata?.memory_size_in_bytes || 0,
        shards: {
          total: indexStats.total?.shards?.total || 0,
          successful: indexStats.total?.shards?.successful || 0,
          failed: indexStats.total?.shards?.failed || 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Elasticsearch stats:', error);
    res.status(500).json({
      success: false,
      error: `Failed to get stats: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
} 