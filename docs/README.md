# Vet Cares - Veterinary Management System

A comprehensive multi-tenant veterinary clinic management system with React frontend and Express backend.

## 🏗️ Project Structure

```
vet-cares/
├── client/                 # React Frontend (Vercel deployment)
│   ├── src/               # React source code
│   ├── package.json       # Frontend dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── vercel.json        # Vercel deployment config
│   └── Dockerfile         # Frontend container
├── server/                # Express Backend
│   ├── server.js          # Main server file
│   ├── scripts/           # Database scripts
│   ├── package.json       # Backend dependencies
│   ├── .env               # Environment variables
│   └── Dockerfile         # Backend container
├── docker-compose.yml     # Local development setup
└── package.json           # Root workspace config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- MongoDB
- Elasticsearch (optional)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd vet-cares
npm run install:all
```

2. **Set up environment variables:**
```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

3. **Start development servers:**
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Deployment

### Frontend (Vercel)

1. **Deploy to Vercel:**
```bash
cd client
vercel
```

2. **Configure environment variables in Vercel dashboard:**
- `VITE_API_URL`: Your backend API URL

3. **Update vercel.json with your backend domain**

### Backend (Any Platform)

1. **Deploy to your preferred platform:**
- Railway
- Render
- DigitalOcean
- AWS
- Google Cloud

2. **Set environment variables:**
```bash
# AWS S3 Configuration
AWS_S3_ACCESS_KEY_ID=your_access_key
AWS_S3_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=your_region

# WhatsApp API Configuration
WHATSAPP_API_URL=https://publicapi.myoperator.co/chat/messages
WHATSAPP_TOKEN=your_token
WHATSAPP_COMPANY_ID=your_company_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Database Configuration
MONGODB_URI=your_mongodb_connection_string
ELASTICSEARCH_URL=your_elasticsearch_url

# Server Configuration
PORT=3001
NODE_ENV=production
```

## 📋 Features

- 🏥 **Multi-tenant Architecture**: Separate data for each clinic
- 📄 **Invoice Management**: Generate and send PDF invoices
- 💬 **WhatsApp Integration**: Send invoices and medical records
- 🐾 **Pet & Client Management**: Complete pet and client records
- 📊 **Analytics Dashboard**: Business insights and reporting
- 🔐 **Role-based Access**: Staff and admin permissions
- 📱 **Responsive Design**: Works on all devices
- 🔍 **SOAP Notes**: Medical record management with search
- 💉 **Vaccination Tracking**: Automated reminders
- 📦 **Inventory Management**: Stock tracking and alerts

## 🛠️ Development

### Available Scripts

**Root (Monorepo):**
```bash
npm run dev              # Start both client and server
npm run dev:client       # Start only frontend
npm run dev:server       # Start only backend
npm run build            # Build frontend for production
npm run install:all      # Install all dependencies
```

**Client:**
```bash
cd client
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

**Server:**
```bash
cd server
npm run dev              # Start development server
npm start                # Start production server
npm run migrate:multitenant  # Run database migrations
npm run test:s3-upload   # Test S3 connectivity
```

### Environment Configuration

See [ENVIRONMENT_CONFIGURATION.md](ENVIRONMENT_CONFIGURATION.md) for detailed setup instructions.

## 📚 Documentation

- [AWS S3 Integration](AWS_S3_INTEGRATION.md)
- [WhatsApp Features](WHATSAPP_FEATURES.md)
- [Multi-tenant Guide](README_MULTITENANT.md)
- [Tenant Management](TENANT_MANAGEMENT_GUIDE.md)
- [Environment Configuration](ENVIRONMENT_CONFIGURATION.md)

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/tenant/current` - Get current tenant
- `POST /api/upload-to-s3` - Upload files to S3
- `POST /api/whatsapp/send-invoice` - Send invoice via WhatsApp

### Entity Endpoints
- `GET/POST /api/clients` - Client management
- `GET/POST /api/pets` - Pet management
- `GET/POST /api/invoices` - Invoice management
- `GET/POST /api/appointments` - Appointment management
- `GET/POST /api/medical_records` - Medical records

## 🐳 Docker

### Production Build
```bash
# Build images
docker build -t vet-cares-client ./client
docker build -t vet-cares-server ./server

# Run containers
docker run -p 80:80 vet-cares-client
docker run -p 3001:3001 vet-cares-server
```

### Development with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f server

# Stop services
docker-compose down
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation files