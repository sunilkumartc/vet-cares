# Multi-Tenant Client System

## Overview

The multi-tenant client system ensures that clients can only access their own data within their specific tenant context. This provides complete data isolation between different veterinary clinics while maintaining a seamless user experience.

## Key Components

### 1. ClientSessionManager (`client/src/lib/clientSession.js`)

A utility class that manages client authentication sessions with tenant-aware functionality.

#### Features:
- **Session Management**: Create, validate, and clear client sessions
- **Tenant Validation**: Ensure clients only access data from their assigned tenant
- **Session Expiration**: Automatic session expiry after 24 hours
- **Data Integrity**: Comprehensive session data structure

#### Key Methods:
```javascript
// Get current client session
ClientSessionManager.getCurrentSession()

// Check if client is authenticated
ClientSessionManager.isAuthenticated()

// Get current client ID
ClientSessionManager.getClientId()

// Get current tenant ID
ClientSessionManager.getTenantId()

// Validate tenant access
ClientSessionManager.validateTenantAccess(currentTenantId)

// Create new session
ClientSessionManager.createSession(clientData, tenantId)

// Clear session
ClientSessionManager.clearSession()

// Update session data
ClientSessionManager.updateSession(updates)
```

### 2. ClientAuthGuard (`client/src/components/ClientAuthGuard.jsx`)

A React component that protects client pages and ensures proper authentication and tenant access.

#### Features:
- **Authentication Check**: Verifies client is logged in
- **Tenant Validation**: Ensures client belongs to current tenant
- **Session Expiry**: Handles expired sessions gracefully
- **User-Friendly UI**: Provides clear error messages and login/logout options

#### Usage:
```jsx
<ClientAuthGuard>
  <YourClientComponent />
</ClientAuthGuard>
```

### 3. Enhanced AuthModal (`client/src/components/home/AuthModal.jsx`)

Updated authentication modal with multi-tenant awareness.

#### Features:
- **Tenant Validation**: Ensures clients only register/login within their tenant
- **Session Creation**: Creates comprehensive client sessions
- **Data Isolation**: Prevents cross-tenant client creation

## Client Session Structure

```javascript
{
  id: "client_mongodb_id",
  client_id: "client_mongodb_id", 
  tenant_id: "tenant_mongodb_id",
  full_name: "First Last",
  first_name: "First",
  last_name: "Last", 
  email: "client@example.com",
  phone: "+1234567890",
  address: "123 Main St",
  role: "user",
  authenticated: true,
  login_time: "2025-01-13T10:30:00.000Z"
}
```

## Multi-Tenant Client Pages

### 1. MyPets (`client/src/pages/MyPets.jsx`)
- **Protected by**: ClientAuthGuard
- **Data Access**: Only shows pets belonging to authenticated client
- **Features**: Pet management, medical history, vaccinations, appointments

### 2. MyInvoices (`client/src/pages/MyInvoices.jsx`)
- **Protected by**: ClientAuthGuard  
- **Data Access**: Only shows invoices for authenticated client
- **Features**: Invoice history, payment status, invoice details

### 3. MyProfile (`client/src/pages/MyProfile.jsx`)
- **Protected by**: ClientAuthGuard
- **Data Access**: Only allows editing own profile
- **Features**: Profile management, session updates

## Security Features

### 1. Tenant Isolation
- Clients can only access data from their assigned tenant
- API calls automatically include tenant_id filter
- Cross-tenant data access is prevented

### 2. Session Security
- Sessions include tenant_id validation
- Automatic session expiry (24 hours)
- Secure session storage in localStorage

### 3. Authentication Flow
1. Client enters credentials on tenant-specific subdomain
2. System validates credentials against tenant's client database
3. Creates session with tenant_id and client_id
4. All subsequent requests include tenant context

## API Integration

### Client API Calls
All client API calls automatically include tenant context:

```javascript
// Example: Getting client's pets
const pets = await TenantPet.filter({ client_id: clientId });
// Automatically includes tenant_id filter
```

### Server-Side Validation
Server validates tenant access on all client endpoints:

```javascript
// Server automatically filters by tenant_id
const query = buildTenantQuery(tenantId, filters);
const data = await collection.find(query).toArray();
```

## Testing

### Manual Testing
1. **Client Registration**: Register new client on tenant subdomain
2. **Client Login**: Login with client credentials
3. **Data Access**: Verify client only sees their data
4. **Cross-Tenant**: Verify client cannot access other tenant data
5. **Session Management**: Test session expiry and logout

### Automated Testing
Run the test script to verify multi-tenant functionality:

```bash
node tenant-scripts/test-multi-tenant-client.js
```

## Configuration

### Tenant Setup
Each tenant must have:
- Unique subdomain (e.g., `clinic1.vetvault.in`)
- Tenant record in database with `_id` and `name`
- Client registration enabled (optional)

### Client Registration
Clients can register if tenant has:
- `registration_settings.require_full_name` (optional)
- Valid tenant configuration

## Troubleshooting

### Common Issues

1. **"Client not authenticated"**
   - Check if client session exists
   - Verify session hasn't expired
   - Ensure client logged in on correct subdomain

2. **"Access denied"**
   - Verify client belongs to current tenant
   - Check tenant_id in session matches current tenant
   - Clear session and re-login

3. **"Unable to determine clinic"**
   - Check tenant resolution from subdomain
   - Verify tenant exists in database
   - Check DNS configuration

### Debug Steps
1. Check browser localStorage for clientSession
2. Verify tenant resolution in browser console
3. Check server logs for tenant_id validation
4. Run test script to verify database integrity

## Best Practices

1. **Always use ClientAuthGuard** for client pages
2. **Use ClientSessionManager** for session operations
3. **Validate tenant access** on all client API calls
4. **Handle session expiry** gracefully
5. **Test cross-tenant isolation** regularly
6. **Monitor session security** and update as needed

## Future Enhancements

1. **JWT Tokens**: Replace localStorage with secure JWT tokens
2. **Refresh Tokens**: Implement automatic session refresh
3. **Multi-Factor Authentication**: Add 2FA for client accounts
4. **Session Analytics**: Track client login patterns
5. **Advanced Permissions**: Role-based access within client accounts 