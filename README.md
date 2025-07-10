# Vet Cares - Veterinary Management System

A comprehensive veterinary clinic management system with multi-tenant support, invoice management, WhatsApp integration, and AWS S3 file storage.

## Features

- 🏥 Multi-tenant veterinary clinic management
- 📄 Invoice generation and PDF upload to AWS S3
- 💬 WhatsApp integration for sending invoices and medical records
- 🐾 Pet and client management
- 📊 Analytics and reporting
- 🔐 Role-based access control
- 📱 Responsive web interface

## Environment Configuration

Before running the application, you need to set up your environment variables:

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```bash
# AWS S3 Configuration
AWS_S3_ACCESS_KEY_ID=your_access_key_id
AWS_S3_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=your_region

# WhatsApp API Configuration
WHATSAPP_API_URL=https://publicapi.myoperator.co/chat/messages
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_COMPANY_ID=your_company_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Installation

```bash
npm install
```

## Running the Application

### Development Mode
```bash
# Run both frontend and backend
npm run dev:full

# Or run separately
npm run server    # Backend only
npm run dev       # Frontend only
```

### Production Build
```bash
npm run build
npm run server
```

## API Endpoints

- `POST /api/upload-to-s3` - Upload files to AWS S3
- `POST /api/whatsapp/send-invoice` - Send invoice via WhatsApp
- `GET /api/tenant/current` - Get current tenant information
- Various CRUD endpoints for entities (clients, pets, invoices, etc.)

## Documentation

- [AWS S3 Integration](AWS_S3_INTEGRATION.md)
- [WhatsApp Features](WHATSAPP_FEATURES.md)
- [Multi-tenant Guide](README_MULTITENANT.md)
- [Tenant Management](TENANT_MANAGEMENT_GUIDE.md)

## Support

For more information and support, please contact the development team.