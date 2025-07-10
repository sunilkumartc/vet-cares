// Native Entity Implementations
// Replaces Base44 SDK entities with MongoDB-native implementations

import { TenantManager } from '@/lib/tenant.js';

// Base Entity Class
class BaseEntity {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async getCollection() {
    // This function is no longer needed as dbUtils is removed
    // await dbUtils.connect();
    // return dbUtils.getCollection(this.collectionName);
    console.warn("getCollection is deprecated as dbUtils is removed.");
    return null; // Placeholder
  }

  async getCurrentTenant() {
    const tenant = TenantManager.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }
    return tenant;
  }

  async list(sort = null, limit = null, filters = {}) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const query = dbUtils.buildTenantQuery(tenant.id, filters);
      // const options = {};
      
      // if (sort) {
      //   const [field, order] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
      //   options.sort = dbUtils.buildSortOptions(field, order);
      // }
      
      // if (limit) {
      //   options.limit = parseInt(limit);
      // }
      
      // const cursor = collection.find(query, options);
      // const results = await cursor.toArray();
      
      // return dbUtils.formatResponse(results);
      console.warn("list is deprecated as dbUtils is removed.");
      return []; // Placeholder
    } catch (error) {
      console.error(`Error listing ${this.collectionName}:`, error);
      throw error;
    }
  }

  async filter(filters = {}, sort = null) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const query = dbUtils.buildTenantQuery(tenant.id, filters);
      // const options = {};
      
      // if (sort) {
      //   const [field, order] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
      //   options.sort = dbUtils.buildSortOptions(field, order);
      // }
      
      // const cursor = collection.find(query, options);
      // const results = await cursor.toArray();
      
      // return dbUtils.formatResponse(results);
      console.warn("filter is deprecated as dbUtils is removed.");
      return []; // Placeholder
    } catch (error) {
      console.error(`Error filtering ${this.collectionName}:`, error);
      throw error;
    }
  }

  async get(id) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const query = dbUtils.buildTenantQuery(tenant.id, { _id: await dbUtils.toObjectId(id) });
      // const result = await collection.findOne(query);
      
      // if (!result) {
      //   throw new Error(`${this.collectionName} not found`);
      // }
      
      // return dbUtils.formatResponse(result);
      console.warn("get is deprecated as dbUtils is removed.");
      return null; // Placeholder
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const document = {
      //   _id: await dbUtils.generateId(),
      //   tenant_id: tenant.id,
      //   ...dbUtils.addTimestamps(data)
      // };
      
      // const result = await collection.insertOne(document);
      
      // return dbUtils.formatResponse(document);
      console.warn("create is deprecated as dbUtils is removed.");
      return null; // Placeholder
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // Verify the document belongs to the current tenant
      // This function is no longer needed as dbUtils is removed
      // const existing = await collection.findOne({
      //   _id: await dbUtils.toObjectId(id),
      //   tenant_id: tenant.id
      // });
      
      // if (!existing) {
      //   throw new Error(`${this.collectionName} not found or access denied`);
      // }
      
      // This function is no longer needed as dbUtils is removed
      // const updateData = dbUtils.addTimestamps(data, true);
      // const result = await collection.updateOne(
      //   { _id: await dbUtils.toObjectId(id), tenant_id: tenant.id },
      //   { $set: updateData }
      // );
      
      // if (result.matchedCount === 0) {
      //   throw new Error(`${this.collectionName} not found`);
      // }
      
      // return await this.get(id);
      console.warn("update is deprecated as dbUtils is removed.");
      return null; // Placeholder
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const result = await collection.deleteOne({
      //   _id: await dbUtils.toObjectId(id),
      //   tenant_id: tenant.id
      // });
      
      // if (result.deletedCount === 0) {
      //   throw new Error(`${this.collectionName} not found or access denied`);
      // }
      
      // return { success: true, deletedCount: result.deletedCount };
      console.warn("delete is deprecated as dbUtils is removed.");
      return null; // Placeholder
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async count(filters = {}) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const query = dbUtils.buildTenantQuery(tenant.id, filters);
      // return await collection.countDocuments(query);
      console.warn("count is deprecated as dbUtils is removed.");
      return 0; // Placeholder
    } catch (error) {
      console.error(`Error counting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async findOne(filters = {}) {
    try {
      const tenant = await this.getCurrentTenant();
      const collection = await this.getCollection();
      
      // This function is no longer needed as dbUtils is removed
      // const query = dbUtils.buildTenantQuery(tenant.id, filters);
      // const result = await collection.findOne(query);
      
      // return result ? dbUtils.formatResponse(result) : null;
      console.warn("findOne is deprecated as dbUtils is removed.");
      return null; // Placeholder
    } catch (error) {
      console.error(`Error finding one ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// Specific Entity Classes
export class TenantClient extends BaseEntity {
  constructor() {
    super('clients');
  }

  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase() });
  }

  async search(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return await this.filter({
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex }
      ]
    });
  }
}

export class TenantPet extends BaseEntity {
  constructor() {
    super('pets');
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId });
  }

  async search(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return await this.filter({
      $or: [
        { name: regex },
        { species: regex },
        { breed: regex }
      ]
    });
  }
}

export class TenantAppointment extends BaseEntity {
  constructor() {
    super('appointments');
  }

  async findByDate(date) {
    return await this.filter({ appointment_date: date });
  }

  async findByPet(petId) {
    return await this.filter({ pet_id: petId });
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId });
  }

  async getUpcoming(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    return await this.filter(
      { appointment_date: { $gte: today } },
      'appointment_date'
    ).then(results => results.slice(0, limit));
  }
}

export class TenantMedicalRecord extends BaseEntity {
  constructor() {
    super('medical_records');
  }

  async findByPet(petId) {
    return await this.filter({ pet_id: petId }, '-visit_date');
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId }, '-visit_date');
  }
}

export class TenantVaccination extends BaseEntity {
  constructor() {
    super('vaccinations');
  }

  async findByPet(petId) {
    return await this.filter({ pet_id: petId }, '-date_administered');
  }

  async getUpcoming(limit = 10) {
    const today = new Date();
    return await this.filter(
      { next_due_date: { $gte: today } },
      'next_due_date'
    ).then(results => results.slice(0, limit));
  }
}

export class TenantInvoice extends BaseEntity {
  constructor() {
    super('invoices');
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId }, '-invoice_date');
  }

  async findByStatus(status) {
    return await this.filter({ status });
  }

  async getUnpaid() {
    return await this.filter({ status: { $in: ['sent', 'overdue'] } });
  }
}

export class Staff extends BaseEntity {
  constructor() {
    super('staff');
  }

  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase() });
  }

  async findByRole(role) {
    return await this.filter({ role });
  }

  async getActive() {
    return await this.filter({ status: 'active' });
  }
}

export class Service extends BaseEntity {
  constructor() {
    super('services');
  }

  async getActive() {
    return await this.filter({ status: 'active' });
  }

  async findByCategory(category) {
    return await this.filter({ category });
  }
}

export class TenantMemo extends BaseEntity {
  constructor() {
    super('memos');
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId }, '-created_date');
  }

  async findByPet(petId) {
    return await this.filter({ pet_id: petId }, '-created_date');
  }

  async getActive() {
    return await this.filter({ is_active: true }, '-created_date');
  }
}

export class TenantProduct extends BaseEntity {
  constructor() {
    super('products');
  }

  async getActive() {
    return await this.filter({ status: 'active' });
  }

  async findByCategory(category) {
    return await this.filter({ category });
  }

  async search(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return await this.filter({
      $or: [
        { name: regex },
        { description: regex },
        { sku: regex }
      ]
    });
  }

  async getLowStock() {
    return await this.filter({
      $expr: { $lte: ['$total_stock', '$reorder_level'] }
    });
  }
}

export class TenantProductBatch extends BaseEntity {
  constructor() {
    super('product_batches');
  }

  async findByProduct(productId) {
    return await this.filter({ product_id: productId }, '-received_date');
  }

  async getExpiringSoon(days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return await this.filter({
      expiry_date: { $lte: expiryDate },
      quantity_on_hand: { $gt: 0 }
    }, 'expiry_date');
  }
}

export class TenantSale extends BaseEntity {
  constructor() {
    super('sales');
  }

  async findByClient(clientId) {
    return await this.filter({ client_id: clientId }, '-sale_date');
  }

  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    return await this.filter({ sale_date: today });
  }
}

export class MissedSale extends BaseEntity {
  constructor() {
    super('missed_sales');
  }

  async getRecent(limit = 10) {
    return await this.filter({}, '-created_date').then(results => results.slice(0, limit));
  }
}

export class TenantStockMovement extends BaseEntity {
  constructor() {
    super('stock_movements');
  }

  async findByProduct(productId) {
    return await this.filter({ product_id: productId }, '-movement_date');
  }
}

export class TenantVaccine extends BaseEntity {
  constructor() {
    super('vaccines');
  }

  async getActive() {
    return await this.filter({ status: 'active' });
  }
}

export class TenantDiagnosticReport extends BaseEntity {
  constructor() {
    super('diagnostic_reports');
  }

  async findByPet(petId) {
    return await this.filter({ pet_id: petId }, '-created_date');
  }
}

export class TenantReportTemplate extends BaseEntity {
  constructor() {
    super('report_templates');
  }

  async getActive() {
    return await this.filter({ is_active: true });
  }
}

// Auth entity (simplified for now)
export class User {
  static async me() {
    // This would be implemented based on your authentication system
    // For now, return a mock user
    return {
      id: 'current-user',
      email: 'user@example.com',
      role: 'admin'
    };
  }
}

// Export all entities
export const entities = {
  TenantClient: new TenantClient(),
  TenantPet: new TenantPet(),
  TenantAppointment: new TenantAppointment(),
  TenantMedicalRecord: new TenantMedicalRecord(),
  TenantVaccination: new TenantVaccination(),
  TenantInvoice: new TenantInvoice(),
  Staff: new Staff(),
  Service: new Service(),
  TenantMemo: new TenantMemo(),
  TenantProduct: new TenantProduct(),
  TenantProductBatch: new TenantProductBatch(),
  TenantSale: new TenantSale(),
  MissedSale: new MissedSale(),
  TenantStockMovement: new TenantStockMovement(),
  TenantVaccine: new TenantVaccine(),
  TenantDiagnosticReport: new TenantDiagnosticReport(),
  TenantReportTemplate: new TenantReportTemplate(),
  User
};