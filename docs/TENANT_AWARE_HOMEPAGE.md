# Tenant-Aware Homepage and Client Login Configuration

This document explains how the homepage and client login system have been made tenant-aware and configurable in the multi-tenant veterinary application.

## Overview

The homepage and client authentication system now dynamically adapts to each tenant's configuration, displaying tenant-specific information and branding while maintaining a consistent user experience.

## Homepage Tenant Configuration

### Dynamic Content Areas

The homepage now displays tenant-specific information in the following areas:

1. **Header/Navigation**
   - Clinic name and tagline
   - Logo (if configured)

2. **Hero Section**
   - Welcome message with clinic name
   - Custom description

3. **About Section**
   - Clinic name in headings
   - Custom description
   - Team information

4. **Contact Section**
   - Address
   - Phone number
   - Email
   - WhatsApp integration
   - Google Maps integration

5. **Footer**
   - Clinic name in copyright
   - Custom description

### Tenant Data Structure

The tenant document now includes the following fields for homepage customization:

```javascript
{
  // Basic clinic information
  clinic_name: "Dr. Ravi Pet Care Center",
  tagline: "Where every pet is family",
  description: "Comprehensive description of the clinic...",
  
  // Contact information
  address: "No. 32, 4th temple Street road...",
  phone: "+91 82961 43115",
  email: "info@ravipetcare.com",
  website: "https://ravipetcare.com",
  
  // Team members (optional)
  team_members: [
    {
      id: 1,
      name: "Dr. Ravi Kumar",
      title: "Chief Veterinarian & Clinic Director",
      specialization: "Small Animal Medicine & Surgery",
      qualifications: "BVSc & AH, MVSc (Veterinary Medicine)",
      experience: "8+ years",
      image: "https://...",
      bio: "Dr. Ravi is passionate about...",
      expertise: ["Internal Medicine", "Soft Tissue Surgery", "Emergency Care", "Preventive Medicine"]
    }
  ],
  
  // Success stories (optional)
  success_stories: [
    {
      id: 1,
      petName: "Buddy",
      ownerName: "Priya Sharma",
      story: "Buddy came to us with severe skin allergies...",
      image: "https://...",
      treatment: "Allergy Treatment & Nutrition Plan",
      rating: 5
    }
  ]
}
```

## Client Login Configuration

### Authentication Settings

Each tenant can configure their client authentication system:

```javascript
{
  // Authentication behavior
  auth_settings: {
    allow_client_registration: true,
    require_email_verification: false,
    require_phone_verification: false,
    allow_guest_appointments: false,
    session_timeout_hours: 24,
    max_login_attempts: 5,
    lockout_duration_minutes: 30
  },
  
  // Registration form configuration
  registration_settings: {
    require_full_name: true,
    require_phone: false,
    require_address: false,
    allow_social_login: false,
    welcome_message: "Welcome to our veterinary family!",
    terms_of_service: "By creating an account...",
    privacy_policy_url: "https://ravipetcare.com/privacy",
    terms_url: "https://ravipetcare.com/terms"
  },
  
  // Login UI customization
  login_customization: {
    login_title: "Welcome Back!",
    login_subtitle: "Sign in to book appointments and manage your pets",
    signup_title: "Join Our Pet Care Family",
    signup_subtitle: "Create account to get started with personalized pet care",
    forgot_password_enabled: true,
    remember_me_enabled: true,
    show_social_login: false
  },
  
  // Client dashboard features
  dashboard_settings: {
    show_pet_gallery: true,
    show_appointment_history: true,
    show_medical_records: true,
    show_vaccination_reminders: true,
    show_billing_history: true,
    allow_profile_editing: true,
    allow_pet_management: true
  }
}
```

## Implementation Details

### HomePage Component (`client/src/pages/Home.jsx`)

- Uses `TenantManager.getCurrentTenant()` to load tenant information
- Displays loading state while tenant data is being fetched
- Falls back to default content if tenant data is not available
- Dynamically renders tenant-specific content throughout the page

### AuthModal Component (`client/src/components/home/AuthModal.jsx`)

- Loads tenant configuration when modal opens
- Uses tenant-specific titles and subtitles
- Conditionally shows/hides form fields based on tenant settings
- Displays tenant-specific terms and privacy policy links

### Tenant Data Loading

The tenant information is loaded using the existing `TenantManager` system:

```javascript
import { TenantManager } from '@/lib/tenant';

const currentTenant = TenantManager.getCurrentTenant();
```

## Setup Scripts

### Setting Up Clinic Profile

Run the clinic profile setup script to add sample data:

```bash
node tenant-scripts/setup-clinic-profile.js
```

This script adds:
- Clinic name, tagline, and description
- Contact information (address, phone, email)
- Team members with photos and bios
- Success stories with pet photos

### Setting Up Client Auth Configuration

Run the client auth configuration script:

```bash
node tenant-scripts/setup-client-auth-config.js
```

This script adds:
- Authentication settings
- Registration form configuration
- Login UI customization
- Dashboard feature toggles

## Customization Options

### For Each Tenant

1. **Clinic Branding**
   - Update clinic name, tagline, and description
   - Add custom team members and success stories
   - Configure contact information

2. **Authentication Behavior**
   - Enable/disable client registration
   - Configure required fields for registration
   - Set session timeout and security settings

3. **UI Customization**
   - Customize login/signup titles and messages
   - Configure terms of service and privacy policy
   - Enable/disable dashboard features

### Default Fallbacks

If tenant-specific data is not available, the system falls back to:
- Generic clinic names and descriptions
- Default team members and success stories
- Standard authentication behavior
- Default UI text and styling

## Benefits

1. **Brand Consistency**: Each tenant's homepage reflects their unique branding
2. **Flexible Configuration**: Easy to customize without code changes
3. **Scalable**: New tenants can be configured independently
4. **User Experience**: Clients see relevant information for their specific clinic
5. **Maintenance**: Centralized configuration management

## Future Enhancements

1. **Admin Interface**: Web-based configuration panel for tenants
2. **Template System**: Pre-built templates for different clinic types
3. **Advanced Customization**: Custom CSS and layout options
4. **Analytics**: Track homepage performance per tenant
5. **A/B Testing**: Test different configurations for optimization 