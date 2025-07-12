import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantManager } from '@/lib/tenant';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantTheme();
  }, []);

  const loadTenantTheme = async () => {
    try {
      setLoading(true);
      
      // Get current tenant
      const currentTenant = TenantManager.getCurrentTenant();
      
      if (currentTenant) {
        // Use tenant's theme configuration
        const tenantTheme = currentTenant.theme_json 
          ? JSON.parse(currentTenant.theme_json)
          : TenantManager.getDefaultTheme();
        
        setTheme({
          ...tenantTheme,
          tenant: currentTenant
        });
      } else {
        // Fallback to default theme
        setTheme({
          ...TenantManager.getDefaultTheme(),
          tenant: null
        });
      }
    } catch (error) {
      console.error('Error loading tenant theme:', error);
      // Fallback to default theme
      setTheme({
        ...TenantManager.getDefaultTheme(),
        tenant: null
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const getColor = (colorKey) => {
    if (!theme?.colors) return '#3B82F6'; // Default blue
    return theme.colors[colorKey] || theme.colors.primary || '#3B82F6';
  };

  const getBranding = (brandingKey) => {
    if (!theme?.tenant) return '';
    
    // Map branding keys to tenant fields
    const brandingMap = {
      logo: theme.tenant.logo_url,
      clinicName: theme.tenant.clinic_name || theme.tenant.name,
      tagline: theme.tenant.tagline,
      favicon: theme.tenant.favicon_url
    };
    
    return brandingMap[brandingKey] || '';
  };

  const hasFeature = (featureKey) => {
    if (!theme?.features) return true; // Default to enabled
    return theme.features[featureKey] !== false;
  };

  const getTenantInfo = () => {
    return theme?.tenant || null;
  };

  const value = {
    theme,
    loading,
    updateTheme,
    getColor,
    getBranding,
    hasFeature,
    getTenantInfo,
    reloadTheme: loadTenantTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 