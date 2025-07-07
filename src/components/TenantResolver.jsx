import React, { useEffect, useState } from 'react';
import { TenantManager } from '@/lib/tenant';
import { useTheme } from '@/contexts/ThemeContext';

export const TenantResolver = ({ children }) => {
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState(null);
  const { reloadTheme } = useTheme();

  useEffect(() => {
    resolveTenant();
  }, []);

  const resolveTenant = async () => {
    try {
      // Get host from window location
      const host = window.location.host;
      
      // Resolve tenant from host
      const tenant = await TenantManager.resolveTenant(host);
      
      if (tenant) {
        // Set current tenant
        TenantManager.setCurrentTenant(tenant);
        
        // Reload theme with new tenant
        await reloadTheme();
        
        setResolved(true);
      } else {
        // No tenant found - could be a 404 or default tenant
        console.warn('No tenant found for host:', host);
        
        // For development, create a default tenant
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          const defaultTenant = {
            id: 'default',
            slug: 'default',
            name: 'Default Clinic',
            theme_json: JSON.stringify(TenantManager.getDefaultTheme())
          };
          
          TenantManager.setCurrentTenant(defaultTenant);
          await reloadTheme();
          setResolved(true);
        } else {
          setError('Tenant not found');
        }
      }
    } catch (error) {
      console.error('Error resolving tenant:', error);
      setError('Failed to resolve tenant');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Not Found</h1>
          <p className="text-gray-600 mb-4">
            The requested clinic could not be found. Please check the URL and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinic...</p>
        </div>
      </div>
    );
  }

  return children;
}; 