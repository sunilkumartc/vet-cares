// API TenantClient for communicating with Express backend
const API_BASE_URL = '/api';

// Utility function to clean parameters
function cleanParams(params) {
  console.log(`cleanParams - Input:`, params);
  const cleanParams = {};
  Object.keys(params).forEach(key => {
    const value = params[key];
    console.log(`cleanParams - Processing key: ${key}, value: ${value}, type: ${typeof value}`);
    if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null' && value !== '') {
      cleanParams[key] = value;
      console.log(`cleanParams - Added key: ${key}, value: ${value}`);
    } else {
      console.log(`cleanParams - Skipped key: ${key}, value: ${value}`);
    }
  });
  console.log(`cleanParams - Output:`, cleanParams);
  return cleanParams;
}

class HttpClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    console.log(`HttpClient - get() called with endpoint:`, endpoint);
    console.log(`HttpClient - Original params:`, params);
    
    const cleanedParams = cleanParams(params);
    console.log(`HttpClient - Cleaned params:`, cleanedParams);
    
    const queryString = new URLSearchParams(cleanedParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    console.log(`HttpClient - Final URL:`, url);
    
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, params = {}) {
    const cleanedParams = cleanParams(params);
    const queryString = new URLSearchParams(cleanedParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'DELETE' });
  }
}

// Base Entity class for API operations
class BaseApiEntity {
  constructor(entityName, apiClient) {
    this.entityName = entityName;
    this.api = apiClient;
  }

  async list(sort = null, limit = null, filters = {}) {
    console.log(`API Client - list() called for ${this.entityName}`);
    console.log(`API Client - Original filters:`, filters);
    console.log(`API Client - Sort:`, sort);
    console.log(`API Client - Limit:`, limit);
    
    const cleanFilters = cleanParams(filters);
    console.log(`API Client - Cleaned filters:`, cleanFilters);
    
    const params = { ...cleanFilters };
    if (sort) params.sort = sort;
    if (limit) params.limit = limit;
    
    // Get current tenant
    const tenant = await this.getCurrentTenant();
    console.log(`API Client - Listing ${this.entityName} with tenant:`, tenant);
    if (tenant) {
      params.tenant_id = tenant._id || tenant.id;
    }
    console.log(`API Client - Final request params:`, params);
    
    const result = await this.api.get(`/${this.entityName}`, params);
    console.log(`API Client - ${this.entityName} result:`, result);
    return result;
  }

  async filter(filters = {}, sort = null) {
    console.log(`API Client - filter() called for ${this.entityName}`);
    console.log(`API Client - Original filters:`, filters);
    console.log(`API Client - Sort:`, sort);
    
    const cleanFilters = cleanParams(filters);
    console.log(`API Client - Cleaned filters:`, cleanFilters);
    
    const params = { ...cleanFilters };
    if (sort) params.sort = sort;
    
    // Get current tenant
    const tenant = await this.getCurrentTenant();
    console.log(`API Client - Filtering ${this.entityName} with tenant:`, tenant);
    if (tenant) {
      params.tenant_id = tenant._id || tenant.id;
    }
    
    console.log(`API Client - Filter params for ${this.entityName}:`, params);
    const result = await this.api.get(`/${this.entityName}`, params);
    console.log(`API Client - Filter result for ${this.entityName}:`, result);
    return result;
  }

  async get(id) {
    const tenant = await this.getCurrentTenant();
    console.log(`API Client - Getting ${this.entityName} with ID:`, id);
    console.log(`API Client - Current tenant:`, tenant);
    
    // Only add tenant_id if it exists
    const params = {};
    if (tenant && (tenant._id || tenant.id)) {
      params.tenant_id = tenant._id || tenant.id;
    }
    console.log(`API Client - Request params:`, params);
    
    // Validate id parameter
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error(`Invalid ID provided for ${this.entityName}: ${id}`);
    }
    
    const url = `/${this.entityName}/${id}`;
    console.log(`API Client - Request URL:`, url);
    
    try {
      const result = await this.api.get(url, params);
      console.log(`API Client - ${this.entityName} result:`, result);
      return result;
    } catch (error) {
      console.error(`API Client - Error getting ${this.entityName}:`, error);
      throw error;
    }
  }

  async create(data) {
    const tenant = await this.getCurrentTenant();
    const requestData = tenant ? { ...data, tenant_id: tenant._id || tenant.id } : data;
    return this.api.post(`/${this.entityName}`, requestData);
  }

  async update(id, data) {
    console.log(`API Client - Updating ${this.entityName} with ID:`, id);
    console.log(`API Client - Update data:`, data);
    const tenant = await this.getCurrentTenant();
    const requestData = tenant ? { ...data, tenant_id: tenant._id || tenant.id } : data;
    console.log(`API Client - Final request data:`, requestData);
    return this.api.put(`/${this.entityName}/${id}`, requestData);
  }

  async delete(id) {
    const tenant = await this.getCurrentTenant();
    const params = tenant ? { tenant_id: tenant._id || tenant.id } : {};
    return this.api.delete(`/${this.entityName}/${id}`, params);
  }

  async count(filters = {}) {
    console.log(`API Client - count() called for ${this.entityName}`);
    console.log(`API Client - Original filters:`, filters);
    
    const tenant = await this.getCurrentTenant();
    const cleanFilters = cleanParams(filters);
    console.log(`API Client - Cleaned filters:`, cleanFilters);
    
    const params = { ...cleanFilters };
    if (tenant) {
      params.tenant_id = tenant._id || tenant.id;
    }
    const result = await this.api.get(`/${this.entityName}`, params);
    return Array.isArray(result) ? result.length : 0;
  }

  async findOne(filters = {}) {
    console.log(`API Client - findOne() called for ${this.entityName}`);
    console.log(`API Client - Original filters:`, filters);
    
    const tenant = await this.getCurrentTenant();
    const cleanFilters = cleanParams(filters);
    console.log(`API Client - Cleaned filters:`, cleanFilters);
    
    const params = { ...cleanFilters };
    if (tenant) {
      params.tenant_id = tenant._id || tenant.id;
    }
    const result = await this.api.get(`/${this.entityName}`, params);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async getCurrentTenant() {
    try {
      console.log('API Client - Getting current tenant...');
      const tenant = await this.api.get('/tenant/current');
      console.log('API Client - Current tenant:', tenant);
      return tenant;
    } catch (error) {
      console.error('API Client - Error getting current tenant:', error);
      return null;
    }
  }
}

// Create API client instance
const apiClient = new HttpClient();

// Create entity instances
export { apiClient as ApiClient };
export const ApiStaff = new BaseApiEntity('staff', apiClient);
export const ApiClient_entity = new BaseApiEntity('clients', apiClient);
export const ApiPet = new BaseApiEntity('pets', apiClient);
export const ApiAppointment = new BaseApiEntity('appointments', apiClient);
export const ApiMedicalRecord = new BaseApiEntity('medical_records', apiClient);
export const ApiVaccination = new BaseApiEntity('vaccinations', apiClient);
export const ApiInvoice = new BaseApiEntity('invoices', apiClient);
export const ApiService = new BaseApiEntity('services', apiClient);
export const ApiMemo = new BaseApiEntity('memos', apiClient);
export const ApiProduct = new BaseApiEntity('products', apiClient);
export const ApiProductBatch = new BaseApiEntity('product_batches', apiClient);
export const ApiSale = new BaseApiEntity('sales', apiClient);
export const ApiMissedSale = new BaseApiEntity('missed_sales', apiClient);
export const ApiStockMovement = new BaseApiEntity('stock_movements', apiClient);
export const ApiVaccine = new BaseApiEntity('vaccines', apiClient);
export const ApiDiagnosticReport = new BaseApiEntity('diagnostic_reports', apiClient);
export const ApiReportTemplate = new BaseApiEntity('report_templates', apiClient);
 