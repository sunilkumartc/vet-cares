# MongoDB Environment Setup Guide

## Overview
This guide explains how to configure MongoDB connections for both development (localhost) and production (MongoDB Atlas) environments.

## Environment Configuration

### Development Environment (Localhost)
- **Database**: Local MongoDB instance
- **Connection**: `mongodb://localhost:27017`
- **Environment**: `NODE_ENV=development`

### Production Environment (MongoDB Atlas)
- **Database**: MongoDB Atlas cloud database
- **Connection**: `mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/`
- **Environment**: `NODE_ENV=production`

## Quick Setup

### For Development
```bash
# Run the development setup script
./deploy-development.sh
```

### For Production
```bash
# Run the production setup script
./deploy-production.sh
```

## Manual Setup

### 1. Environment File Setup
Copy the environment template:
```bash
cp env.example .env
```

### 2. Configure for Development
Edit `.env` file:
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
```

### 3. Configure for Production
Edit `.env` file:
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/
```

## MongoDB Atlas Setup

### 1. Database Credentials
- **Username**: `sunilkumartc89`
- **Password**: `IJLOURnjitHsiFiS`
- **Cluster**: `cluster0.yy1jozd.mongodb.net`
- **Database**: `vet-cares`

### 2. Connection String Format
```
mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/
```

### 3. Network Access
Ensure your IP address is whitelisted in MongoDB Atlas:
1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Add your IP address or use `0.0.0.0/0` for all IPs (not recommended for production)

## Local MongoDB Setup

### macOS (using Homebrew)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Check status
brew services list | grep mongodb
```

### Manual Start
```bash
# Create data directory
mkdir -p /usr/local/var/mongodb

# Start MongoDB
mongod --dbpath /usr/local/var/mongodb
```

## Environment Variables

### Required Variables
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017` | `mongodb+srv://...` | MongoDB connection string |

### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `LOG_LEVEL` | `info` | Logging level |

## Testing Connections

### Test Development Connection
```bash
# Start local MongoDB
brew services start mongodb-community

# Test connection
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
client.connect().then(() => {
  console.log('✅ Development MongoDB connected');
  client.close();
}).catch(err => {
  console.error('❌ Development MongoDB connection failed:', err);
});
"
```

### Test Production Connection
```bash
# Test Atlas connection
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/');
client.connect().then(() => {
  console.log('✅ Production MongoDB Atlas connected');
  client.close();
}).catch(err => {
  console.error('❌ Production MongoDB Atlas connection failed:', err);
});
"
```

## Application Configuration

### Server Configuration (`server/lib/mongodb.js`)
The application automatically detects the environment and uses the appropriate connection:

```javascript
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Use MongoDB Atlas
  uri = process.env.MONGODB_URI || 'mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/';
} else {
  // Use localhost
  uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
}
```

### Connection Options
The application includes optimized connection options:
- `maxPoolSize: 10` - Maximum connection pool size
- `serverSelectionTimeoutMS: 5000` - Server selection timeout
- `socketTimeoutMS: 45000` - Socket timeout

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`
**Solution**: Start local MongoDB
```bash
brew services start mongodb-community
```

#### 2. Atlas Authentication Failed
**Error**: `MongoServerError: Authentication failed`
**Solution**: Check credentials and network access
1. Verify username/password in Atlas
2. Check IP whitelist in Atlas Network Access
3. Ensure database user has correct permissions

#### 3. Environment Variable Not Set
**Error**: `MongoParseError: Invalid connection string`
**Solution**: Set environment variables
```bash
export NODE_ENV=development
export MONGODB_URI=mongodb://localhost:27017
```

### Debug Mode
Enable debug logging:
```bash
export LOG_LEVEL=debug
```

## Security Considerations

### Development
- Use local MongoDB for development
- No sensitive data in development database
- Regular backups not required

### Production
- Use MongoDB Atlas with proper authentication
- Enable network access restrictions
- Regular backups and monitoring
- Use environment variables for credentials
- Consider using MongoDB Atlas IAM roles

## Migration Between Environments

### Development to Production
1. Update `.env` file:
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://sunilkumartc89:IJLOURnjitHsiFiS@cluster0.yy1jozd.mongodb.net/
   ```

2. Restart the application:
   ```bash
   npm start
   ```

### Production to Development
1. Update `.env` file:
   ```bash
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017
   ```

2. Ensure local MongoDB is running:
   ```bash
   brew services start mongodb-community
   ```

3. Restart the application:
   ```bash
   npm start
   ```

## Monitoring and Health Checks

### Health Check Endpoint
The application includes a health check endpoint:
```bash
curl http://localhost:3001/api/health
```

### Database Health Check
```javascript
// Check database connection
const health = await dbUtils.healthCheck();
console.log(health); // { status: 'healthy', connected: true }
```

## Support

For issues with:
- **Local MongoDB**: Check MongoDB documentation
- **MongoDB Atlas**: Contact MongoDB Atlas support
- **Application**: Check application logs and error messages 