// MongoDB Connection and Utilities
// Replaces Base44 SDK dependency

class MongoDBManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return this.db;

    try {
      const { MongoClient } = await import('mongodb');
      
      // Handle both browser and Node.js environments
      let uri;
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        uri = import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/petclinic';
      } else {
        // Node.js environment
        uri = process.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/petclinic';
      }
      
      this.client = new MongoClient(uri);
      
      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;
      
      console.log('Connected to MongoDB');
      return this.db;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
    }
  }

  getDb() {
    if (!this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection(name) {
    return this.getDb().collection(name);
  }
}

// Singleton instance
const mongodbManager = new MongoDBManager();

// Utility functions for common operations
export const dbUtils = {
  async connect() {
    return await mongodbManager.connect();
  },

  async disconnect() {
    return await mongodbManager.disconnect();
  },

  getCollection(name) {
    return mongodbManager.getCollection(name);
  },

  // Generate ObjectId
  async generateId() {
    // Use dynamic import for ObjectId
    const { ObjectId } = await import('mongodb');
    return new ObjectId();
  },

  // Convert string to ObjectId
  async toObjectId(id) {
    if (typeof id === 'string') {
      const { ObjectId } = await import('mongodb');
      return new ObjectId(id);
    }
    return id;
  },

  // Build query with tenant filter
  buildTenantQuery(tenantId, additionalFilters = {}) {
    return {
      tenant_id: tenantId,
      ...additionalFilters
    };
  },

  // Handle pagination
  buildPaginationOptions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return {
      skip,
      limit: parseInt(limit)
    };
  },

  // Build sort options
  buildSortOptions(sortField, sortOrder = 'asc') {
    if (!sortField) return {};
    
    const order = sortOrder === 'desc' ? -1 : 1;
    return { [sortField]: order };
  },

  // Format response data
  formatResponse(data, includeId = true) {
    if (Array.isArray(data)) {
      return data.map(item => this.formatResponse(item, includeId));
    }
    
    if (data && typeof data === 'object') {
      const formatted = { ...data };
      
      if (includeId && data._id) {
        formatted.id = data._id.toString();
        delete formatted._id;
      }
      
      return formatted;
    }
    
    return data;
  },

  // Add timestamps
  addTimestamps(data, isUpdate = false) {
    const now = new Date();
    
    if (isUpdate) {
      return { ...data, updated_at: now };
    }
    
    return {
      ...data,
      created_at: now,
      updated_at: now
    };
  }
};

export default mongodbManager; 