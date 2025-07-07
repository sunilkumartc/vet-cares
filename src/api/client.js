// API TenantClient - Replaces Base44 SDK
// Provides a unified interface for all API operations

import { dbUtils } from './mongodb.js';
import { entities } from './entities.js';

class APIClient {
  constructor() {
    this._entities = entities;
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await dbUtils.connect();
      this.isConnected = true;
    }
  }

  // Entity access
  get entities() {
    return this._entities;
  }

  // Auth methods
  async authenticate(credentials) {
    // This would implement your authentication logic
    // For now, return a mock session
    return {
      id: 'user-123',
      email: credentials.email,
      role: 'admin',
      tenant_id: 'default-tenant-id'
    };
  }

  async getCurrentUser() {
    return await entities.User.me();
  }

  // Utility methods
  async healthCheck() {
    try {
      await this.connect();
      const collection = dbUtils.getCollection('tenants');
      await collection.findOne({});
      return { status: 'healthy', connected: true };
    } catch (error) {
      return { status: 'unhealthy', connected: false, error: error.message };
    }
  }

  // Batch operations
  async batchCreate(collectionName, documents) {
    await this.connect();
    const collection = dbUtils.getCollection(collectionName);
    
    const documentsWithTimestamps = await Promise.all(documents.map(async doc => ({
      _id: await dbUtils.generateId(),
      ...dbUtils.addTimestamps(doc)
    })));
    
    const result = await collection.insertMany(documentsWithTimestamps);
    return dbUtils.formatResponse(documentsWithTimestamps);
  }

  async batchUpdate(collectionName, updates) {
    await this.connect();
    const collection = dbUtils.getCollection(collectionName);
    
    const operations = await Promise.all(updates.map(async update => ({
      updateOne: {
        filter: { _id: await dbUtils.toObjectId(update.id) },
        update: { $set: dbUtils.addTimestamps(update.data, true) }
      }
    })));
    
    const result = await collection.bulkWrite(operations);
    return result;
  }

  // Search functionality
  async search(collectionName, searchTerm, fields = []) {
    await this.connect();
    const collection = dbUtils.getCollection(collectionName);
    
    const searchQuery = {
      $or: fields.map(field => ({
        [field]: { $regex: searchTerm, $options: 'i' }
      }))
    };
    
    const results = await collection.find(searchQuery).toArray();
    return dbUtils.formatResponse(results);
  }

  // Aggregation
  async aggregate(collectionName, pipeline) {
    await this.connect();
    const collection = dbUtils.getCollection(collectionName);
    
    const results = await collection.aggregate(pipeline).toArray();
    return dbUtils.formatResponse(results);
  }

  // Statistics
  async getStats(collectionName) {
    await this.connect();
    const collection = dbUtils.getCollection(collectionName);
    
    const total = await collection.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await collection.countDocuments({
      created_at: { $gte: today }
    });
    
    return {
      total,
      today: todayCount,
      collection: collectionName
    };
  }
}

// Create singleton instance
const apiClient = new APIClient();

// Export for backward compatibility
export const base44 = {
  entities: entities,
  auth: entities.User,
  functions: {
    // Mock functions - replace with actual implementations
    sendSMS: async (data) => console.log('SMS sent:', data),
    generatePetId: async () => `PET-${Date.now()}`,
    sendWhatsAppDocument: async (data) => console.log('WhatsApp document sent:', data),
    generateSalesReceipt: async (data) => console.log('Sales receipt generated:', data),
    sendWhatsAppReminder: async (data) => console.log('WhatsApp reminder sent:', data),
    sendWhatsAppMessage: async (data) => console.log('WhatsApp message sent:', data),
    sendVaccinationReminders: async (data) => console.log('TenantVaccination reminders sent:', data)
  }
};

export default apiClient; 