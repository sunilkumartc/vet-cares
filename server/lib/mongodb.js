// MongoDB Connection and Utilities
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class MongoDBManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return this.db;

    try {
      let uri;
      if (typeof window === 'undefined') {
        // Server-side
        uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      } else {
        // Client-side (should not happen in server)
        uri = import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017';
      }

      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db('vet-cares');
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

  getCollection(name) {
    if (!this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db.collection(name);
  }

  async generateId() {
    return new ObjectId();
  }

  async toObjectId(id) {
    if (!id) {
      return null;
    }
    
    if (typeof id === 'string') {
      // Check if it's a valid ObjectId format (24 character hex string)
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        return new ObjectId(id);
      } else {
        // If it's not a valid ObjectId, return null or handle as string ID
        console.warn(`Invalid ObjectId format: ${id}`);
        return null;
      }
    }
    
    if (id instanceof ObjectId) {
      return id;
    }
    
    return null;
  }

  addTimestamps(data, isUpdate = false) {
    const now = new Date().toISOString();
    if (isUpdate) {
      return { ...data, updated_date: now };
    }
    return {
      ...data,
      created_date: now,
      updated_date: now
    };
  }

  buildTenantQuery(tenantId, additionalFilters = {}) {
    return {
      tenant_id: tenantId,
      ...additionalFilters
    };
  }

  buildSortOptions(field, order) {
    return { [field]: order === 'desc' ? -1 : 1 };
  }

  formatResponse(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.formatSingleResponse(item));
    }
    return this.formatSingleResponse(data);
  }

  formatSingleResponse(item) {
    if (!item) return item;
    
    const formatted = { ...item };
    
    // Convert ObjectId to string for JSON serialization
    if (formatted._id && typeof formatted._id === 'object') {
      formatted._id = formatted._id.toString();
    }
    
    // Convert dates to ISO strings
    if (formatted.created_date && typeof formatted.created_date === 'object') {
      formatted.created_date = formatted.created_date.toISOString();
    }
    if (formatted.updated_date && typeof formatted.updated_date === 'object') {
      formatted.updated_date = formatted.updated_date.toISOString();
    }
    
    return formatted;
  }

  async healthCheck() {
    try {
      await this.connect();
      await this.db.admin().ping();
      return { status: 'healthy', connected: true };
    } catch (error) {
      return { status: 'unhealthy', connected: false, error: error.message };
    }
  }
}

// Create and export a singleton instance
const mongodbManager = new MongoDBManager();

// Export utility functions
export const dbUtils = {
  connect: () => mongodbManager.connect(),
  disconnect: () => mongodbManager.disconnect(),
  getCollection: (name) => mongodbManager.getCollection(name),
  generateId: () => mongodbManager.generateId(),
  toObjectId: (id) => mongodbManager.toObjectId(id),
  addTimestamps: (data, isUpdate) => mongodbManager.addTimestamps(data, isUpdate),
  buildTenantQuery: (tenantId, filters) => mongodbManager.buildTenantQuery(tenantId, filters),
  buildSortOptions: (field, order) => mongodbManager.buildSortOptions(field, order),
  formatResponse: (data) => mongodbManager.formatResponse(data),
  healthCheck: () => mongodbManager.healthCheck()
};

export default mongodbManager; 