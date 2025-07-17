// Production-Ready Tenant Management System

// Tenant cache for performance
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Usage tracking
const usageTracker = {
  apiCalls: new Map(),
  storageUsage: new Map(),
  userActivity: new Map()
};

export class TenantManager {
  static async resolveTenant(host) {
    try {
      // Extract tenant slug from host
      const slug = this.extractTenantSlug(host);
      if (!slug) return null;

      // Always clear cache for this slug to ensure fresh data
      tenantCache.delete(slug);
      
      // Also clear localStorage cache to prevent stale data
      localStorage.removeItem('currentTenant');

      // Fetch tenant from backend with cache-busting
      const tenant = await this.fetchTenantBySlug(slug);
      if (tenant) {
        // Validate tenant status
        if (!this.isTenantActive(tenant)) {
          throw new Error(`Tenant ${slug} is not active`);
        }

        // Validate that the tenant matches the expected subdomain
        if (tenant.subdomain && tenant.subdomain !== slug) {
          console.warn(`Tenant subdomain mismatch: expected ${slug}, got ${tenant.subdomain}`);
        }

        // Track usage
        this.trackUsage(tenant.id, 'page_view');

        // Cache the tenant with current timestamp
        tenantCache.set(slug, {
          tenant,
          timestamp: Date.now()
        });
        
        // Also store in localStorage for persistence
        this.setCurrentTenant(tenant);
      }

      return tenant;
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return null;
    }
  }

  static extractTenantSlug(host) {
    if (!host) return null;
    
    // Handle localhost development
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const parts = host.split('.');
      if (parts.length > 1) {
        return parts[0];
      }
      // Default tenant for localhost
      return 'default';
    }

    // Production: extract subdomain
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[0];
    }

    return null;
  }

  static async fetchTenantBySlug(slug) {
    try {
      // Use the backend API instead of direct MongoDB access
      // Add cache-busting parameter to prevent browser caching
      const cacheBuster = Date.now();
      const response = await fetch(`/api/tenant/current?_t=${cacheBuster}`, {
        headers: {
          'Host': window.location.host,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const tenant = await response.json();
        console.log(`[TENANT] Fetched tenant for ${slug}:`, tenant.name, tenant.subdomain);
        return tenant;
      }
      
      console.error(`[TENANT] Failed to fetch tenant for ${slug}:`, response.status, response.statusText);
      return null;
    } catch (error) {
      console.error('Error fetching tenant:', error);
      return null;
    }
  }

  static isTenantActive(tenant) {
    return tenant && tenant.status === 'active';
  }

  static async validateTenantLimits(tenantId, operation) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) return false;

      const limits = {
        staff: tenant.max_staff || 10,
        clients: tenant.max_clients || 1000,
        storage: tenant.max_storage_gb || 10
      };

      const currentUsage = await this.getTenantUsage(tenantId);

      switch (operation) {
        case 'add_staff':
          return currentUsage.staff_count < limits.staff;
        case 'add_client':
          return currentUsage.client_count < limits.clients;
        case 'add_storage':
          return currentUsage.storage_used < limits.storage;
        default:
          return true;
      }
    } catch (error) {
      console.error('Error validating tenant limits:', error);
      return false;
    }
  }

  static async getTenantById(tenantId) {
    try {
      const response = await fetch(`/api/tenant/${tenantId || 'current'}`);
      if (response.ok) {
        const tenant = await response.json();
        return tenant;
      }
      return null;
    } catch (error) {
      console.error('Error fetching tenant by ID:', error);
      return null;
    }
  }

  static async getTenantUsage(tenantId) {
    try {
      const response = await fetch(`/api/tenant/${tenantId}/usage`);
      if (response.ok) {
        const usage = await response.json();
        return usage;
      }
      return {
        staff_count: 0,
        client_count: 0,
        appointment_count: 0,
        storage_used: 0,
        last_activity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting tenant usage:', error);
      return {
        staff_count: 0,
        client_count: 0,
        appointment_count: 0,
        storage_used: 0,
        last_activity: new Date().toISOString()
      };
    }
  }

  static trackUsage(tenantId, action) {
    const now = Date.now();
    
    // Track API calls
    if (!usageTracker.apiCalls.has(tenantId)) {
      usageTracker.apiCalls.set(tenantId, []);
    }
    usageTracker.apiCalls.get(tenantId).push({ action, timestamp: now });

    // Track user activity
    if (!usageTracker.userActivity.has(tenantId)) {
      usageTracker.userActivity.set(tenantId, []);
    }
    usageTracker.userActivity.get(tenantId).push({ action, timestamp: now });

    // Clean up old data (keep last 24 hours)
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    usageTracker.apiCalls.set(tenantId, 
      usageTracker.apiCalls.get(tenantId).filter(entry => entry.timestamp > oneDayAgo)
    );
    usageTracker.userActivity.set(tenantId,
      usageTracker.userActivity.get(tenantId).filter(entry => entry.timestamp > oneDayAgo)
    );
  }

  static getCurrentTenant() {
    const tenantData = localStorage.getItem('currentTenant');
    return tenantData ? JSON.parse(tenantData) : null;
  }

  static setCurrentTenant(tenant) {
    if (tenant) {
      // Clear any existing tenant data first
      localStorage.removeItem('currentTenant');
      // Set new tenant data
      localStorage.setItem('currentTenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('currentTenant');
    }
  }

  static clearCache() {
    tenantCache.clear();
  }

  static getDefaultTheme() {
    return {
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280'
      },
      branding: {
        logo: null,
        favicon: null,
        clinicName: 'Pet Clinic',
        tagline: 'Caring for your pets with love and expertise'
      },
      features: {
        appointments: true,
        billing: true,
        inventory: true,
        analytics: true,
        staffManagement: true,
        clientPortal: true
      }
    };
  }

  // Billing Management
  static async getBillingInfo(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) return null;

      const usage = await this.getTenantUsage(tenantId);
      
      const billingPlans = {
        basic: { price: 29, features: ['Up to 10 staff', 'Up to 1000 clients', 'Basic support'] },
        professional: { price: 79, features: ['Up to 25 staff', 'Up to 5000 clients', 'Priority support', 'Custom branding'] },
        enterprise: { price: 199, features: ['Unlimited staff', 'Unlimited clients', '24/7 support', 'SSO', 'API access'] }
      };

      const plan = billingPlans[tenant.billing_plan || 'basic'];
      
      return {
        plan: tenant.billing_plan || 'basic',
        price: plan.price,
        features: plan.features,
        usage,
        limits: {
          staff: tenant.max_staff || 10,
          clients: tenant.max_clients || 1000,
          storage: tenant.max_storage_gb || 10
        },
        nextBillingDate: this.getNextBillingDate(tenant.created_date),
        status: tenant.status
      };
    } catch (error) {
      console.error('Error getting billing info:', error);
      return null;
    }
  }

  static getNextBillingDate(createdDate) {
    const created = new Date(createdDate);
    const next = new Date(created);
    next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  // Security Features
  static async validateApiKey(tenantId, apiKey) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant || !tenant.api_access) return false;

      // In production, you'd validate against stored API keys
      return apiKey && apiKey.length > 0;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  static async logSecurityEvent(tenantId, event) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/security-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: event.type,
          details: event.details,
          ip: event.ip,
          userAgent: event.userAgent
        })
      });
      if (!response.ok) {
        console.error('Failed to log security event:', response.status);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Analytics and Monitoring
  static async getTenantAnalytics(tenantId, period = '30d') {
    try {
      const usage = await this.getTenantUsage(tenantId);
      const apiCalls = usageTracker.apiCalls.get(tenantId) || [];
      const userActivity = usageTracker.userActivity.get(tenantId) || [];

      const now = Date.now();
      const periodMs = period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const startTime = now - periodMs;

      const recentApiCalls = apiCalls.filter(call => call.timestamp > startTime);
      const recentUserActivity = userActivity.filter(activity => activity.timestamp > startTime);

      return {
        period,
        usage,
        apiCalls: {
          total: recentApiCalls.length,
          byAction: this.groupByAction(recentApiCalls)
        },
        userActivity: {
          total: recentUserActivity.length,
          byAction: this.groupByAction(recentUserActivity)
        },
        performance: {
          averageResponseTime: 150, // Mock data
          uptime: 99.9, // Mock data
          errorRate: 0.1 // Mock data
        }
      };
    } catch (error) {
      console.error('Error getting tenant analytics:', error);
      return null;
    }
  }

  static groupByAction(entries) {
    return entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {});
  }

  // Tenant Management Operations
  static async suspendTenant(tenantId, reason) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        await this.logSecurityEvent(tenantId, {
          type: 'tenant_suspended',
          details: { reason },
          ip: 'system',
          userAgent: 'system'
        });
        return true;
      }
      console.error('Failed to suspend tenant:', response.status);
      return false;
    } catch (error) {
      console.error('Error suspending tenant:', error);
      return false;
    }
  }

  static async activateTenant(tenantId) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/activate`, {
        method: 'POST'
      });
      if (response.ok) {
        return true;
      }
      console.error('Failed to activate tenant:', response.status);
      return false;
    } catch (error) {
      console.error('Error activating tenant:', error);
      return false;
    }
  }

  static async updateTenantLimits(tenantId, limits) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/limits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(limits)
      });
      if (response.ok) {
        return true;
      }
      console.error('Failed to update tenant limits:', response.status);
      return false;
    } catch (error) {
      console.error('Error updating tenant limits:', error);
      return false;
    }
  }

  // Backup and Recovery
  static async createTenantBackup(tenantId) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/backup`, {
        method: 'POST'
      });
      if (response.ok) {
        const backupData = await response.json();
        return backupData;
      }
      console.error('Failed to create tenant backup:', response.status);
      return null;
    } catch (error) {
      console.error('Error creating tenant backup:', error);
      return null;
    }
  }

  static async getTenantBackups(tenantId) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tenant/${tenantId}/backups`);
      if (response.ok) {
        const backups = await response.json();
        return backups;
      }
      return [];
    } catch (error) {
      console.error('Error getting tenant backups:', error);
      return [];
    }
  }
}

// Note: TenantScopedData class has been removed
// Use the new tenant-aware entities from @/api/tenantEntities instead
// Example: import { TenantClient, TenantPet } from '@/api/tenantEntities' 