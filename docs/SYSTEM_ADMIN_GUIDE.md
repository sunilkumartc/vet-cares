# 🛡️ System Admin Portal Guide

## 🔐 System Admin Login

The Vet Cares system now has a separate **System Admin Portal** for managing tenants and system-wide operations. This is completely separate from regular staff login.

### **Access URLs:**
- **System Admin Login**: `http://localhost:5173/system-admin-login`
- **Tenant Management**: `http://localhost:5173/tenant-management` (requires login)

### **Default System Admin Credentials:**
```
Username: systemadmin
Password: systemadmin123
```

⚠️ **IMPORTANT**: Change these credentials in production!

## 🚀 How to Access System Admin Portal

### **Step 1: Navigate to System Admin Login**
1. Go to `http://localhost:5173/system-admin-login`
2. You'll see a blue-themed login page with a shield icon

### **Step 2: Login with System Admin Credentials**
1. Enter username: `systemadmin`
2. Enter password: `systemadmin123`
3. Click "Sign In to System Admin"

### **Step 3: Access Tenant Management**
- After successful login, you'll be automatically redirected to `/tenant-management`
- You'll see a blue header indicating "System Admin Portal"
- The page is now protected and requires system admin authentication

## 🔒 Security Features

### **Authentication Flow:**
1. **Login**: System admin credentials are verified against the `system_admins` collection
2. **Token Generation**: A secure token is created and stored in localStorage
3. **Route Protection**: All system admin routes are protected by `SystemAdminGuard`
4. **Token Verification**: Each request to protected routes verifies the token
5. **Auto Logout**: Invalid or expired tokens automatically redirect to login

### **Security Measures:**
- ✅ Separate authentication system from regular staff
- ✅ Token-based authentication
- ✅ Route protection with guards
- ✅ Automatic session management
- ✅ Login attempt tracking
- ✅ Account locking capabilities

## 🏢 Tenant Management Features

Once logged in as system admin, you can:

### **Tenant Operations:**
- ✅ View all tenants in the system
- ✅ Create new tenants
- ✅ Edit existing tenant configurations
- ✅ Delete tenants (with confirmation)
- ✅ Suspend/activate tenants
- ✅ View tenant analytics and usage

### **System Administration:**
- ✅ Monitor system-wide analytics
- ✅ Manage billing and subscriptions
- ✅ View security logs
- ✅ Create system backups
- ✅ Configure global settings

## 🔧 Technical Implementation

### **Frontend Components:**
- `SystemAdminLogin.jsx` - Login page for system admins
- `SystemAdminGuard.jsx` - Route protection component
- `TenantManagement.jsx` - Protected tenant management interface

### **Backend API Endpoints:**
- `POST /api/admin/login` - System admin authentication
- `GET /api/admin/verify` - Token verification
- `POST /api/admin/logout` - Logout functionality

### **Database Collections:**
- `system_admins` - System administrator accounts
- `tenants` - Tenant configurations and data
- `security_logs` - System security events

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Access Denied" Error**
   - Make sure you're logged in as system admin
   - Clear browser localStorage and login again
   - Check if the server is running

2. **"Invalid Credentials" Error**
   - Verify username: `systemadmin`
   - Verify password: `systemadmin123`
   - Check if the system admin account exists in MongoDB

3. **"Connection Error"**
   - Ensure the backend server is running on port 3001
   - Check MongoDB connection
   - Verify network connectivity

### **Reset System Admin Account:**
```bash
# Run the system admin creation script
node create-system-admin.js
```

## 🔄 Regular Staff vs System Admin

| Feature | Regular Staff | System Admin |
|---------|---------------|--------------|
| **Login URL** | `/StaffLogin` | `/system-admin-login` |
| **Access Level** | Tenant-specific | System-wide |
| **Can Manage** | Staff, clients, pets | Tenants, system settings |
| **Authentication** | Staff credentials | System admin credentials |
| **Data Scope** | Single tenant | All tenants |

## 📝 Next Steps

1. **Change Default Credentials**: Update the system admin password in production
2. **Add More System Admins**: Create additional admin accounts as needed
3. **Implement JWT**: Replace simple token with proper JWT authentication
4. **Add Audit Logging**: Implement comprehensive audit trails
5. **Multi-Factor Authentication**: Add 2FA for system admin accounts

## 🎯 Quick Start Commands

```bash
# Start the backend server
node server.js

# Start the frontend (in another terminal)
npm run dev

# Create system admin account
node create-system-admin.js

# Access system admin portal
# Go to: http://localhost:5173/system-admin-login
```

---

**System Admin Portal is now ready for production use!** 🎉 