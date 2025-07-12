// Permission utility for tenant-specific access control
import { createPageUrl } from './index';

// Permission mapping for different pages and actions
export const PERMISSION_MAP = {
  // Page access permissions
  'Dashboard': 'dashboard',
  'Appointments': 'appointments',
  'Clients': 'client_management',
  'Pets': 'client_management',
  'Billing': 'billing',
  'StaffManagement': 'staff_management',
  'InventoryManagement': 'inventory_management',
  'Vaccinations': 'vaccinations',
  'MedicalRecords': 'medical_records',
  'DiagnosticReports': 'diagnostic_reports',
  'Analytics': 'analytics',
  'SalesDispense': 'sales_dispense',
  'VaccineSettings': 'vaccine_settings',
  'Settings': 'settings',
  
  // Action permissions
  'create_appointment': 'appointments',
  'edit_appointment': 'appointments',
  'delete_appointment': 'appointments',
  'view_appointment': 'appointments',
  
  'create_client': 'client_management',
  'edit_client': 'client_management',
  'delete_client': 'client_management',
  'view_client': 'client_management',
  
  'create_pet': 'client_management',
  'edit_pet': 'client_management',
  'delete_pet': 'client_management',
  'view_pet': 'client_management',
  
  'create_billing': 'billing',
  'edit_billing': 'billing',
  'delete_billing': 'billing',
  'view_billing': 'billing',
  
  'create_staff': 'staff_management',
  'edit_staff': 'staff_management',
  'delete_staff': 'staff_management',
  'view_staff': 'staff_management',
  
  'create_inventory': 'inventory_management',
  'edit_inventory': 'inventory_management',
  'delete_inventory': 'inventory_management',
  'view_inventory': 'inventory_management',
  
  'create_medical_record': 'medical_records',
  'edit_medical_record': 'medical_records',
  'delete_medical_record': 'medical_records',
  'view_medical_record': 'medical_records',
  
  'create_vaccination': 'vaccinations',
  'edit_vaccination': 'vaccinations',
  'delete_vaccination': 'vaccinations',
  'view_vaccination': 'vaccinations',
};

// Get current user session
export const getCurrentUser = () => {
  try {
    const staffSession = localStorage.getItem('staffSession');
    if (staffSession) {
      return JSON.parse(staffSession);
    }
    
    const userSession = localStorage.getItem('user');
    if (userSession) {
      return JSON.parse(userSession);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing user session:', error);
    return null;
  }
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'admin' || user.permissions?.includes('all_access')) {
    return true;
  }
  
  // Check specific permission
  const requiredPermission = PERMISSION_MAP[permission];
  if (!requiredPermission) return true; // Default to allow if no mapping
  
  return user.permissions?.includes(requiredPermission) || false;
};

// Check if user can perform action (create, edit, delete, view)
export const canPerformAction = (action, resource) => {
  const permissionKey = `${action}_${resource}`;
  return hasPermission(permissionKey);
};

// Check page access
export const hasPageAccess = (pageName) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  // All logged-in users can access dashboard
  if (pageName === 'Dashboard') return true;
  
  return hasPermission(pageName);
};

// Get tenant ID for current user
export const getCurrentTenantId = () => {
  const user = getCurrentUser();
  return user?.tenant_id || null;
};

// Filter data by tenant
export const filterByTenant = (data, tenantId = null) => {
  if (!tenantId) {
    tenantId = getCurrentTenantId();
  }
  
  if (!tenantId || !data) return data;
  
  // Filter based on tenant_id field
  return data.filter(item => {
    // Handle different field names for tenant ID
    const itemTenantId = item.tenant_id || item.tenantId || item.tenant;
    return itemTenantId === tenantId;
  });
};

// Create permission-aware component wrapper
export const withPermissions = (Component, requiredPermissions = []) => {
  return (props) => {
    const user = getCurrentUser();
    
    if (!user) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this feature.</p>
        </div>
      );
    }
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    
    if (!hasAllPermissions) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this feature.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required permissions: {requiredPermissions.join(', ')}
          </p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// Create read-only wrapper for components
export const withReadOnly = (Component, actionPermissions = {}) => {
  return (props) => {
    const user = getCurrentUser();
    
    if (!user) {
      return <Component {...props} isReadOnly={true} />;
    }
    
    // Check permissions for different actions
    const permissions = {
      canCreate: actionPermissions.create ? hasPermission(actionPermissions.create) : false,
      canEdit: actionPermissions.edit ? hasPermission(actionPermissions.edit) : false,
      canDelete: actionPermissions.delete ? hasPermission(actionPermissions.delete) : false,
      canView: actionPermissions.view ? hasPermission(actionPermissions.view) : true,
    };
    
    // If user can't view, show access denied
    if (!permissions.canView) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this content.</p>
        </div>
      );
    }
    
    // If user can only view, make it read-only
    const isReadOnly = !permissions.canCreate && !permissions.canEdit && !permissions.canDelete;
    
    return (
      <Component 
        {...props} 
        isReadOnly={isReadOnly}
        permissions={permissions}
      />
    );
  };
};

// Hook for permission checking
export const usePermissions = () => {
  const user = getCurrentUser();
  
  return {
    user,
    hasPermission,
    canPerformAction,
    hasPageAccess,
    getCurrentTenantId,
    filterByTenant,
    isAdmin: user?.role === 'admin' || user?.permissions?.includes('all_access'),
    isReadOnly: (action) => !hasPermission(action),
  };
};

// Utility to show read-only indicators
export const ReadOnlyIndicator = ({ children, show = true }) => {
  if (!show) return children;
  
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
        <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-medium">
          Read Only
        </div>
      </div>
    </div>
  );
};

// Permission-aware button component
export const PermissionButton = ({ 
  permission, 
  action, 
  resource, 
  children, 
  disabled = false,
  ...props 
}) => {
  const canPerform = canPerformAction(action, resource);
  
  if (!canPerform) {
    return null; // Don't render button if no permission
  }
  
  return (
    <button 
      {...props} 
      disabled={disabled}
      className={`${props.className || ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// Permission-aware link component
export const PermissionLink = ({ 
  permission, 
  action, 
  resource, 
  children, 
  to,
  ...props 
}) => {
  const canPerform = canPerformAction(action, resource);
  
  if (!canPerform) {
    return (
      <span className="text-gray-400 cursor-not-allowed" title="No permission">
        {children}
      </span>
    );
  }
  
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}; 