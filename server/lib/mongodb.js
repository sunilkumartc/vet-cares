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

  async connect(retryCount = 0) {
    if (this.isConnected) return this.db;

    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
      let uri;
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (typeof window === 'undefined') {
        // Server-side
        if (isProduction) {
          // Production: Use MongoDB Atlas
          const baseUri = process.env.MONGODB_URI || 'mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/';
          // Ensure proper connection string format
          uri = baseUri.includes('?') 
            ? `${baseUri}&retryWrites=true&w=majority`
            : `${baseUri}?retryWrites=true&w=majority`;
          console.log('Connecting to MongoDB Atlas (Production)...');
        } else {
          // Development: Use localhost
          uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
          console.log('Connecting to MongoDB localhost (Development)...');
        }
      } else {
        // Client-side (should not happen in server)
        uri = import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017';
      }

      // MongoDB Atlas connection options
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        retryWrites: true,
        w: 'majority',
      };

      // Add SSL options for MongoDB Atlas
      if (isProduction) {
        options.ssl = true;
        options.sslValidate = true;
        options.tls = true;
        options.tlsAllowInvalidCertificates = false;
        options.tlsAllowInvalidHostnames = false;
        options.tlsInsecure = false;
      }

      this.client = new MongoClient(uri, options);
      
      await this.client.connect();
      this.db = this.client.db('vet-cares');
      this.isConnected = true;

      console.log(`Connected to MongoDB: ${isProduction ? 'Atlas (Production)' : 'Localhost (Development)'}`);
      return this.db;
    } catch (error) {
      console.error(`MongoDB connection failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying connection in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.connect(retryCount + 1);
      }
      
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