// Client Session Management for Multi-Tenant App
class ClientSessionManager {
  static SESSION_KEY = 'clientSession';
  static TENANT_KEY = 'currentTenant';

  // Get current client session
  static getCurrentSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error parsing client session:', error);
      return null;
    }
  }

  // Check if client is authenticated
  static isAuthenticated() {
    const session = this.getCurrentSession();
    return session && session.authenticated && session.tenant_id;
  }

  // Get current client ID
  static getClientId() {
    const session = this.getCurrentSession();
    return session?.client_id || session?.id;
  }

  // Set tenant_id in localStorage
  static setTenantId(tenantId) {
    if (tenantId) localStorage.setItem('tenant_id', tenantId);
  }

  // Get tenant_id from localStorage
  static getTenantId() {
    const session = this.getCurrentSession();
    return session?.tenant_id || localStorage.getItem('tenant_id');
  }

  // Set staff_id in localStorage
  static setStaffId(staffId) {
    if (staffId) localStorage.setItem('staff_id', staffId);
  }

  // Get staff_id from localStorage
  static getStaffId() {
    const session = this.getCurrentSession();
    return session?.staff_id || session?.id || localStorage.getItem('staff_id');
  }

  // Validate session belongs to current tenant
  static validateTenantAccess(currentTenantId) {
    const session = this.getCurrentSession();
    if (!session || !session.authenticated) {
      return false;
    }
    
    // Ensure client belongs to current tenant
    return session.tenant_id === currentTenantId;
  }

  // Create new client session
  static createSession(clientData, tenantId) {
    // Create full_name from first_name and last_name if they exist
    const fullName = clientData.first_name && clientData.last_name 
      ? `${clientData.first_name} ${clientData.last_name}`.trim()
      : clientData.full_name || '';
    
    const sessionData = {
      id: clientData._id || clientData.id,
      client_id: clientData._id || clientData.id,
      tenant_id: tenantId,
      full_name: fullName,
      first_name: clientData.first_name || '',
      last_name: clientData.last_name || '',
      email: clientData.email || '',
      phone: clientData.phone || '',
      address: clientData.address || '',
      role: 'user',
      authenticated: true,
      login_time: new Date().toISOString()
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  }

  // Clear client session
  static clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Update session data
  static updateSession(updates) {
    const currentSession = this.getCurrentSession();
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedSession));
      return updatedSession;
    }
    return null;
  }

  // Check if session is expired (optional - can be implemented later)
  static isSessionExpired() {
    const session = this.getCurrentSession();
    if (!session || !session.login_time) {
      return true;
    }

    // Session expires after 24 hours
    const loginTime = new Date(session.login_time);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
    
    return hoursDiff > 24;
  }

  // Refresh session (extend login time)
  static refreshSession() {
    const session = this.getCurrentSession();
    if (session) {
      session.login_time = new Date().toISOString();
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return session;
    }
    return null;
  }

  // Get display name for the client
  static getDisplayName() {
    const session = this.getCurrentSession();
    if (!session) return 'there';
    
    // Try first_name first, then fallback to full_name, then email
    if (session.first_name && session.first_name.trim()) {
      return session.first_name.trim();
    } else if (session.full_name && session.full_name.trim()) {
      const nameParts = session.full_name.trim().split(' ');
      return nameParts[0] || 'there';
    } else if (session.email && session.email.trim()) {
      return session.email.split('@')[0];
    }
    
    return 'there';
  }
}

export default ClientSessionManager; 