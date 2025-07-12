# Multi-Tenant Clinic Profile Management

## Overview
The Clinic Profile feature allows each tenant (veterinary clinic) to customize their branding and contact information. This includes uploading a custom logo, setting clinic name, tagline, and contact details that are displayed dynamically in the application header.

## Features

### ✅ **Clinic Branding**
- **Custom Logo Upload**: Each clinic can upload their own logo (2MB max, image formats only)
- **Dynamic Clinic Name**: Customizable clinic name displayed in header
- **Tagline Support**: Optional tagline displayed below clinic name
- **Real-time Preview**: Live preview of how the header will look

### ✅ **Contact Information**
- **Phone Number**: Clinic contact number
- **Email Address**: Primary clinic email
- **Website**: Clinic website URL
- **Address**: Physical clinic address
- **Description**: Detailed clinic description

### ✅ **Multi-Tenant Support**
- **Tenant Isolation**: Each clinic's profile is completely isolated
- **Dynamic Loading**: Profile loads based on current tenant/subdomain
- **Automatic Updates**: Header updates immediately after profile changes

## User Interface

### Settings Page Integration
The clinic profile is accessible through the **Settings** page under the **Profile** tab:

```
Settings
├── Profile (NEW) ← Clinic branding and contact info
├── Vaccines
├── Notifications
└── System
```

### Profile Management Interface
- **Logo Upload Section**: Drag & drop or click to upload logo
- **Basic Information Form**: Clinic name, tagline, contact details
- **Live Header Preview**: Shows exactly how the header will appear
- **Save/Reset Buttons**: Save changes or revert to previous settings

## Technical Implementation

### Frontend Components

#### 1. ClinicProfile Component (`client/src/components/settings/ClinicProfile.jsx`)
- **Logo Upload**: File validation, preview, and upload handling
- **Form Management**: Real-time form updates with validation
- **API Integration**: Communicates with backend for profile updates
- **Theme Integration**: Triggers theme reload after updates

#### 2. Updated Settings Page (`client/src/pages/Settings.jsx`)
- **New Profile Tab**: Added as the first tab in settings
- **Tab Navigation**: 4-tab layout with Profile, Vaccines, Notifications, System

#### 3. Enhanced Header (`client/src/components/TenantAwareHeader.jsx`)
- **Dynamic Logo**: Displays tenant logo or fallback icon
- **Error Handling**: Graceful fallback if logo fails to load
- **Responsive Design**: Works on mobile and desktop

#### 4. Updated Theme Context (`client/src/contexts/ThemeContext.jsx`)
- **Branding Mapping**: Maps tenant data to branding properties
- **Dynamic Updates**: Reloads theme when profile changes

### Backend API

#### 1. Clinic Profile Routes (`server/routes/clinic-profile.js`)
- **GET /api/clinic/profile**: Retrieve clinic profile
- **PUT /api/clinic/profile**: Update clinic profile
- **POST /api/clinic/upload-clinic-logo**: Upload logo file
- **DELETE /api/clinic/profile/logo**: Remove logo

#### 2. File Upload Handling
- **Multer Configuration**: 2MB limit, image files only
- **Tenant Isolation**: Files stored with tenant ID prefix
- **Public Serving**: Logo files served via static route

#### 3. Database Schema Updates
Tenant collection now includes:
```javascript
{
  clinic_name: String,      // Custom clinic name
  tagline: String,          // Clinic tagline
  logo_url: String,         // Logo file URL
  address: String,          // Physical address
  phone: String,            // Contact phone
  email: String,            // Contact email
  website: String,          // Website URL
  description: String,      // Clinic description
  updated_at: Date          // Last update timestamp
}
```

## API Endpoints

### GET /api/clinic/profile
**Headers**: `X-Tenant-ID: <tenant_id>`

**Response**:
```json
{
  "success": true,
  "profile": {
    "clinicName": "Happy Paws Veterinary Clinic",
    "tagline": "Caring for your pets with love and expertise",
    "logoUrl": "http://localhost:3000/uploads/clinic-logos/tenant123-1234567890.png",
    "address": "123 Main St, City, State 12345",
    "phone": "+1 (555) 123-4567",
    "email": "clinic@happypaws.com",
    "website": "https://happypaws.com",
    "description": "Full-service veterinary clinic..."
  }
}
```

### PUT /api/clinic/profile
**Headers**: `X-Tenant-ID: <tenant_id>`, `Content-Type: application/json`

**Body**:
```json
{
  "clinicName": "Happy Paws Veterinary Clinic",
  "tagline": "Caring for your pets with love and expertise",
  "address": "123 Main St, City, State 12345",
  "phone": "+1 (555) 123-4567",
  "email": "clinic@happypaws.com",
  "website": "https://happypaws.com",
  "description": "Full-service veterinary clinic..."
}
```

### POST /api/clinic/upload-clinic-logo
**Headers**: `X-Tenant-ID: <tenant_id>`

**Body**: `multipart/form-data` with `logo` file

**Response**:
```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "url": "http://localhost:3000/uploads/clinic-logos/tenant123-1234567890.png",
  "filename": "tenant123-1234567890.png"
}
```

## File Storage

### Logo Storage Structure
```
server/uploads/clinic-logos/
├── tenant1-1234567890.png
├── tenant2-1234567891.jpg
└── tenant3-1234567892.gif
```

### File Naming Convention
- **Format**: `{tenant_id}-{timestamp}{extension}`
- **Example**: `507f1f77bcf86cd799439011-1640995200000.png`

### File Validation
- **Size Limit**: 2MB maximum
- **File Types**: JPG, PNG, GIF, SVG, WebP
- **Validation**: Server-side and client-side validation

## Usage Instructions

### For Clinic Administrators

1. **Access Profile Settings**:
   - Navigate to Settings → Profile tab
   - Profile tab is now the default tab

2. **Upload Logo**:
   - Click "Upload Logo" or drag & drop image file
   - Supported formats: JPG, PNG, GIF, SVG, WebP
   - Maximum size: 2MB
   - Recommended size: 200x200 pixels

3. **Update Clinic Information**:
   - Fill in clinic name (required)
   - Add optional tagline
   - Enter contact information
   - Add clinic description

4. **Preview Changes**:
   - See live preview of header appearance
   - Logo and clinic name shown exactly as they'll appear

5. **Save Changes**:
   - Click "Save Changes" to update profile
   - Header updates immediately
   - Changes are tenant-specific

### For Developers

1. **Testing**:
   ```bash
   node scripts/test-clinic-profile.js
   ```

2. **Database Verification**:
   ```javascript
   // Check tenant profile data
   db.tenants.findOne({ _id: ObjectId("tenant_id") }, {
     clinic_name: 1,
     tagline: 1,
     logo_url: 1,
     address: 1,
     phone: 1,
     email: 1,
     website: 1,
     description: 1
   })
   ```

3. **API Testing**:
   ```bash
   # Get profile
   curl -H "X-Tenant-ID: tenant_id" http://localhost:3000/api/clinic/profile
   
   # Update profile
   curl -X PUT -H "X-Tenant-ID: tenant_id" -H "Content-Type: application/json" \
     -d '{"clinicName":"Test Clinic"}' \
     http://localhost:3000/api/clinic/profile
   ```

## Security & Validation

### Input Validation
- **Clinic Name**: Required, trimmed, non-empty
- **Email**: Optional, validated format if provided
- **Website**: Optional, URL format validation
- **File Upload**: Type and size validation

### Tenant Isolation
- **Tenant ID Required**: All API calls require X-Tenant-ID header
- **File Isolation**: Logo files prefixed with tenant ID
- **Database Isolation**: Profile updates scoped to specific tenant

### Error Handling
- **Graceful Fallbacks**: Default values when profile data missing
- **File Upload Errors**: Clear error messages for validation failures
- **Network Errors**: User-friendly error messages with retry options

## Performance Considerations

### Caching
- **Theme Context**: Caches tenant branding data
- **Logo Files**: Served as static files for fast loading
- **Database Queries**: Optimized with specific field projections

### File Optimization
- **Size Limits**: 2MB limit prevents large file uploads
- **Format Support**: Common image formats for broad compatibility
- **CDN Ready**: File structure supports future CDN integration

## Future Enhancements

### Planned Features
- **Logo Cropping**: In-browser image cropping tool
- **Multiple Logo Sizes**: Different sizes for different contexts
- **Favicon Support**: Custom favicon for each clinic
- **Brand Colors**: Custom color scheme per clinic
- **Social Media Links**: Facebook, Instagram, etc.
- **Business Hours**: Operating hours display
- **Service Areas**: Geographic service area information

### Technical Improvements
- **CDN Integration**: Cloud storage for logo files
- **Image Optimization**: Automatic image compression
- **Progressive Loading**: Lazy loading for logos
- **Analytics**: Track profile update frequency

## Troubleshooting

### Common Issues

1. **Logo Not Displaying**:
   - Check file format (JPG, PNG, GIF, SVG, WebP)
   - Verify file size (max 2MB)
   - Check network connectivity
   - Clear browser cache

2. **Profile Not Saving**:
   - Verify clinic name is provided (required field)
   - Check network connection
   - Ensure tenant ID is correct
   - Check browser console for errors

3. **Header Not Updating**:
   - Refresh page after saving
   - Clear browser cache
   - Check theme context reload
   - Verify tenant resolution

### Debug Commands
```bash
# Test API endpoints
node scripts/test-clinic-profile.js

# Check tenant data
mongo vet-cares --eval "db.tenants.findOne({}, {clinic_name: 1, logo_url: 1})"

# Verify file uploads
ls -la server/uploads/clinic-logos/
```

## Files Modified

### Frontend
- `client/src/components/settings/ClinicProfile.jsx` - New clinic profile component
- `client/src/pages/Settings.jsx` - Added Profile tab
- `client/src/components/TenantAwareHeader.jsx` - Enhanced logo display
- `client/src/contexts/ThemeContext.jsx` - Updated branding system

### Backend
- `server/routes/clinic-profile.js` - New API routes
- `server/server.js` - Added clinic profile routes

### Testing & Documentation
- `scripts/test-clinic-profile.js` - API testing script
- `CLINIC_PROFILE_FEATURE.md` - This documentation

## Deployment Notes

### Environment Variables
```bash
# Required for file uploads
BASE_URL=https://api.vetvault.in

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/vet-cares
```

### File Permissions
```bash
# Ensure upload directory is writable
mkdir -p server/uploads/clinic-logos
chmod 755 server/uploads/clinic-logos
```

### Database Migration
No migration required - new fields are optional and will be added automatically when first profile is saved. 