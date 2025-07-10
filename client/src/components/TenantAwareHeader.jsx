import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { TenantManager } from '@/lib/tenant';

export const TenantAwareHeader = () => {
  const { getColor, getBranding, getTenantInfo } = useTheme();
  const tenant = getTenantInfo();

  return (
    <header 
      className="bg-white shadow-sm border-b"
      style={{ borderColor: getColor('secondary') }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Clinic Name */}
          <div className="flex items-center space-x-4">
            {getBranding('logo') ? (
              <img 
                src={getBranding('logo')} 
                alt="Clinic Logo" 
                className="h-8 w-auto"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: getColor('primary') }}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            
            <div>
              <h1 
                className="text-xl font-bold"
                style={{ color: getColor('text') }}
              >
                {getBranding('clinicName') || 'TenantPet Clinic'}
              </h1>
              {getBranding('tagline') && (
                <p 
                  className="text-sm"
                  style={{ color: getColor('textSecondary') }}
                >
                  {getBranding('tagline')}
                </p>
              )}
            </div>
          </div>

          {/* Tenant Info */}
          <div className="flex items-center space-x-4">
            {tenant && (
              <div className="text-right">
                <p 
                  className="text-sm font-medium"
                  style={{ color: getColor('text') }}
                >
                  {tenant.name}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: getColor('textSecondary') }}
                >
                  {tenant.slug}.base44.com
                </p>
              </div>
            )}
            
            {/* Theme Switcher (for development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Theme:</span>
                <div className="flex space-x-1">
                  {['primary', 'secondary', 'accent'].map((colorKey) => (
                    <div
                      key={colorKey}
                      className="w-4 h-4 rounded border border-gray-300 cursor-pointer"
                      style={{ backgroundColor: getColor(colorKey) }}
                      title={colorKey}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TenantAwareHeader; 