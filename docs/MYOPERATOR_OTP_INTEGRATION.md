# MyOperator OTP Integration

This document describes the seamless OTP-based authentication system integrated with MyOperator for customer login and signup in the veterinary care application.

## Overview

The OTP integration provides a frictionless authentication experience for customers, eliminating the need for passwords while ensuring security through time-based one-time passwords sent via WhatsApp.

## Features

- **Seamless Login/Signup**: Single flow for both new and existing customers
- **WhatsApp OTP**: OTP delivered via MyOperator's WhatsApp integration
- **Profile Completion**: Guided profile setup for new customers
- **Multi-tenant Support**: Tenant-aware authentication
- **Session Management**: Automatic session creation and management
- **Security**: 10-minute OTP expiry, attempt limiting, secure storage

## Architecture

### Frontend Components

1. **OTPAuthModal** (`client/src/components/auth/OTPAuthModal.jsx`)
   - Multi-step authentication flow
   - Phone number input with country code selection
   - OTP verification interface
   - Profile completion form

2. **OTP Service** (`client/src/api/otpService.js`)
   - API client for OTP operations
   - Session management integration
   - Error handling and validation

### Backend API

1. **OTP Routes** (`server/routes/otp.js`)
   - `/api/otp/send` - Send OTP via MyOperator
   - `/api/otp/verify` - Verify OTP and create session
   - `/api/otp/check-phone` - Check if phone number exists
   - `/api/otp/update-profile` - Update customer profile

### Database Schema

#### OTP Verifications Collection
```javascript
{
  _id: ObjectId,
  phone_number: String,
  country_code: String,
  otp: String,
  myop_ref_id: String,
  tenant_id: String,
  created_at: Date,
  expires_at: Date,
  verified: Boolean,
  attempts: Number,
  verified_at: Date
}
```

#### Enhanced Clients Collection
```javascript
{
  _id: ObjectId,
  tenant_id: String,
  phone: String,
  first_name: String,
  last_name: String,
  email: String,
  address: String,
  status: String,
  profile_completed: Boolean,
  created_at: Date,
  updated_at: Date
}
```

## Configuration

### MyOperator Settings
```javascript
const MYOPERATOR_API_URL = 'https://publicapi.myoperator.co/chat/messages';
const MYOPERATOR_TOKEN = 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
const MYOPERATOR_COMPANY_ID = '685ef0684b5ee840';
const PHONE_NUMBER_ID = '697547396774899';
```

### Environment Variables
```bash
MONGODB_URI=mongodb://localhost:27017/vet-cares
SERVER_URL=http://localhost:3000
```

## Usage Flow

### 1. Customer Initiates Authentication
- Customer clicks "Book Appointment" or "Login" on homepage
- OTPAuthModal opens with phone number input

### 2. Phone Number Verification
- Customer enters phone number with country code
- System checks if phone number exists
- OTP is generated and sent via MyOperator WhatsApp

### 3. OTP Verification
- Customer receives OTP on WhatsApp
- Enters 4-digit OTP in the interface
- System verifies OTP against stored record

### 4. Session Creation
- If OTP is valid, session is created
- Customer data is retrieved or new customer is created
- Session is stored in localStorage

### 5. Profile Completion (New Customers)
- If profile is incomplete, customer is prompted to fill details
- Name, email, and address are collected
- Profile is marked as completed

### 6. Redirect to Dashboard
- Customer is redirected to MyPets page
- Full access to customer features

## API Endpoints

### Send OTP
```http
POST /api/otp/send
Content-Type: application/json

{
  "phoneNumber": "9535339196",
  "countryCode": "91",
  "otp": "1234",
  "myopRefId": "abc123def456",
  "tenant_id": "tenant-123"
}
```

### Verify OTP
```http
POST /api/otp/verify
Content-Type: application/json

{
  "phoneNumber": "9535339196",
  "otp": "1234",
  "myopRefId": "abc123def456"
}
```

### Check Phone
```http
GET /api/otp/check-phone?phoneNumber=9535339196
```

### Update Profile
```http
POST /api/otp/update-profile
Content-Type: application/json

{
  "clientId": "client-123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "address": "123 Main St"
}
```

## Security Features

### OTP Security
- **Expiry**: 10-minute time limit
- **Attempt Limiting**: Maximum 3 failed attempts
- **Random Generation**: Cryptographically secure OTP generation
- **One-time Use**: OTP becomes invalid after verification

### Session Security
- **Tenant Isolation**: Sessions are tenant-specific
- **Secure Storage**: Session data stored in localStorage with encryption
- **Automatic Cleanup**: Expired sessions are automatically removed

### Data Protection
- **Phone Validation**: Country code and format validation
- **Input Sanitization**: All inputs are sanitized and validated
- **Error Handling**: Secure error messages without data leakage

## Integration Points

### Homepage Integration
- "Book Appointment" and "Login" buttons trigger OTP authentication
- Seamless flow from homepage to customer dashboard

### Appointment Booking
- OTP authentication required before booking appointments
- Automatic retry after successful authentication

### Customer Dashboard
- All customer pages require valid session
- Session validation on page load

## Error Handling

### Common Error Scenarios
1. **Invalid Phone Number**: Format validation and user feedback
2. **OTP Expired**: Clear message and resend option
3. **Too Many Attempts**: Temporary lockout with retry timer
4. **MyOperator API Failure**: Fallback messaging and retry logic
5. **Network Issues**: Offline detection and retry mechanisms

### User Experience
- Clear error messages with actionable guidance
- Loading states and progress indicators
- Resend OTP functionality with cooldown timer
- Graceful fallbacks for edge cases

## Testing

### Test Script
Run the comprehensive test script:
```bash
node tenant-scripts/test-otp-integration.js
```

### Manual Testing
1. Test with valid phone number
2. Test with invalid OTP
3. Test OTP expiry
4. Test profile completion flow
5. Test session persistence
6. Test multi-tenant isolation

## Monitoring and Logging

### Logging
- OTP send/verify attempts
- MyOperator API responses
- Session creation/destruction
- Error occurrences and stack traces

### Metrics
- OTP success/failure rates
- Authentication completion rates
- Profile completion rates
- API response times

## Troubleshooting

### Common Issues

#### OTP Not Received
1. Check MyOperator API credentials
2. Verify phone number format
3. Check MyOperator dashboard for delivery status
4. Review server logs for API errors

#### Authentication Fails
1. Verify OTP expiry time
2. Check attempt limiting
3. Validate session storage
4. Review tenant isolation

#### Profile Not Saving
1. Check client ID in session
2. Verify database connection
3. Review update profile API
4. Check form validation

### Debug Commands
```bash
# Check OTP records
db.otp_verifications.find().sort({created_at: -1}).limit(10)

# Check client records
db.clients.find().sort({created_at: -1}).limit(10)

# Check MyOperator API status
curl -X POST https://publicapi.myoperator.co/chat/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-MYOP-COMPANY-ID: YOUR_COMPANY_ID"
```

## Future Enhancements

### Planned Features
1. **Biometric Authentication**: Fingerprint/Face ID support
2. **Multi-factor Authentication**: Additional security layers
3. **Social Login**: Google/Facebook integration
4. **Voice OTP**: Phone call OTP delivery
5. **Advanced Analytics**: User behavior tracking

### Performance Optimizations
1. **Caching**: Redis-based OTP caching
2. **Rate Limiting**: Advanced rate limiting per IP/phone
3. **CDN Integration**: Global OTP delivery optimization
4. **Database Indexing**: Optimized queries for large datasets

## Support

For technical support or questions about the OTP integration:
1. Check server logs for detailed error information
2. Review MyOperator dashboard for delivery status
3. Test with the provided test script
4. Contact development team with specific error details

## Conclusion

The MyOperator OTP integration provides a modern, secure, and user-friendly authentication system that enhances the customer experience while maintaining high security standards. The seamless flow from authentication to appointment booking creates a frictionless experience for pet owners. 