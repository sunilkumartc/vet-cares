// Tenant-aware entity wrappers using API client
import { 
  ApiClient_entity as ApiClient,
  ApiPet,
  ApiAppointment,
  ApiMedicalRecord,
  ApiVaccination,
  ApiInvoice,
  ApiStaff,
  ApiService,
  ApiMemo,
  ApiProduct,
  ApiProductBatch,
  ApiSale,
  ApiMissedSale,
  ApiStockMovement,
  ApiVaccine,
  ApiDiagnosticReport,
  ApiReportTemplate
} from './apiClient.js';

// Export API-based entities with tenant-aware names
export const User = {
  me: async () => {
    // For now, return a mock user or get from localStorage
    const staffSession = localStorage.getItem('staffSession');
    const clientSession = localStorage.getItem('clientSession');
    
    if (staffSession) {
      return JSON.parse(staffSession);
    } else if (clientSession) {
      return JSON.parse(clientSession);
    }
    
    return null;
  }
};

export const TenantClient = ApiClient;
export const TenantPet = ApiPet;
export const TenantAppointment = ApiAppointment;
export const TenantMedicalRecord = ApiMedicalRecord;
export const TenantVaccination = ApiVaccination;
export const TenantInvoice = ApiInvoice;
export const TenantStaff = ApiStaff;
export const TenantService = ApiService;
export const Service = ApiService; // Alias for backward compatibility
export const TenantMemo = ApiMemo;
export const TenantProduct = ApiProduct;
export const TenantProductBatch = ApiProductBatch;
export const TenantSale = ApiSale;
export const TenantMissedSale = ApiMissedSale;
export const TenantStockMovement = ApiStockMovement;
export const TenantVaccine = ApiVaccine;
export const TenantDiagnosticReport = ApiDiagnosticReport;
export const TenantReportTemplate = ApiReportTemplate;
 