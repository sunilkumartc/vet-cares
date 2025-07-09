# WhatsApp Integration Features

## Overview
The VetVault application includes comprehensive WhatsApp integration for both invoice sending and vaccination reminders, with full tenant-aware functionality.

## Invoice Sending Features

### Send Invoice Button
- **Location**: Invoice List and Invoice Details pages
- **Function**: Generates PDF, uploads to Cloudflare R2, and sends WhatsApp message
- **Features**:
  - PDF generation with professional invoice layout
  - Cloudflare R2 upload with public URL
  - **Tenant-aware WhatsApp messaging** with clinic-specific details
  - Loading states and error handling
  - Toast notifications for user feedback

### Tenant-Aware WhatsApp Messages
Invoice WhatsApp messages are now tenant-aware and include:
- **Customer name**: Personalized greeting
- **Invoice amount**: Total amount due
- **Payment link**: Direct PDF access via Cloudflare R2
- **Clinic-specific details**: 
  - Clinic name from tenant configuration
  - Contact phone from tenant settings
- **Professional formatting**: Consistent branding per clinic

### How Tenant Details Work for Invoices
1. **Invoice Creation**: Each invoice includes `tenant_id` from the current tenant context
2. **WhatsApp Sending**: Backend fetches tenant details using `tenant_id`
3. **Message Personalization**: Clinic name and contact info are dynamically inserted
4. **Fallback**: Uses default values if tenant details unavailable

## Vaccination Reminders

### Automated Reminder System
- **Schedule**: Daily cron job at 9:00 AM IST
- **Reminder Points**: 14, 7, and 3 days before vaccination due date
- **One-time Sending**: Each reminder is sent only once per pet per due date
- **Logging**: All sent reminders are logged in the database

### Tenant-Aware Reminder Messages
Vaccination reminders include tenant-specific information:
- **Clinic name**: From tenant configuration
- **Doctor name**: From tenant settings
- **Contact phone**: From tenant details
- **Pet details**: Pet name, vaccination type, due date
- **Professional formatting**: Consistent with clinic branding

### Manual Testing
```bash
# Set up test data with vaccination dates
node scripts/setup-test-vaccination-data.js

# Run vaccination reminders manually
node scripts/run-vaccination-reminders.js

# Test tenant-aware invoice sending
node scripts/test-tenant-aware-invoice.js
```

## Technical Implementation

### Backend API Endpoints
- `/api/whatsapp/send-invoice` - Invoice sending with tenant details
- `/api/whatsapp/send-reminder` - Vaccination reminder sending

### Database Collections
- `tenants` - Tenant configuration and contact details
- `pets` - Pet information with `tenant_id` and vaccination dates
- `invoices` - Invoice data with `tenant_id`
- `whatsapp_logs` - Log of sent WhatsApp messages

### Configuration
- **WhatsApp API**: MyOperator integration
- **Cloudflare R2**: Document storage and public URL generation
- **Cron Jobs**: Automated reminder scheduling
- **Tenant Resolution**: Dynamic tenant detail fetching

## Setup and Configuration

### Required Environment Variables
```bash
# WhatsApp API (MyOperator)
WHATSAPP_API_URL=https://publicapi.myoperator.co/chat/messages
WHATSAPP_TOKEN=your_token_here
COMPANY_ID=your_company_id
PHONE_NUMBER_ID=your_phone_number_id

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-domain.com
```

### Tenant Configuration
Each tenant should have:
- `name` or `clinic_name` - Display name for messages
- `phone` or `contact_phone` - Contact number for messages
- `doctor_name` - Doctor name for vaccination reminders

### Testing
1. **Setup Test Data**: Run the vaccination test setup script
2. **Test Reminders**: Run the manual reminder script
3. **Test Invoices**: Use the tenant-aware invoice test script
4. **Verify Messages**: Check WhatsApp for received messages

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure backend proxy endpoints are working
2. **Tenant Not Found**: Verify tenant_id exists in invoices/pets
3. **WhatsApp API Errors**: Check API credentials and rate limits
4. **PDF Generation**: Ensure jsPDF is properly configured

### Debugging
- Check server logs for API responses
- Verify tenant details in database
- Test individual API endpoints
- Monitor WhatsApp delivery status

## Future Enhancements
- Message delivery tracking
- Retry mechanisms for failed sends
- Custom message templates per tenant
- Bulk messaging capabilities
- Message history and analytics 