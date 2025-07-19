# Daily.co Video Consultation Integration

## Overview

This document describes the comprehensive Daily.co integration for multi-tenant video consultations with per-meeting expiry controls and JWT token management.

## Features

- ✅ **Multi-tenant support** with tenant_id and staff_id isolation
- ✅ **Per-meeting expiry controls** with `exp`, `nbf`, and `eject_after_elapsed`
- ✅ **JWT token generation** for secure room access
- ✅ **Meeting scheduling** with MongoDB storage
- ✅ **Role-based permissions** (staff vs patient)
- ✅ **Automatic room cleanup** and token validation
- ✅ **Real-time meeting status** tracking

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```bash
# Daily.co API Configuration
DAILY_API_KEY=your_daily_api_key_here

# MongoDB Configuration (existing)
MONGODB_URI=mongodb://localhost:27017
DB_NAME=vet-cares
```

### Getting Daily.co API Key

1. Sign up at [daily.co](https://daily.co)
2. Go to your account dashboard
3. Navigate to "API Keys" section
4. Generate a new API key
5. Copy the key to your `.env` file

## Backend API Endpoints

### 1. Create Meeting

**POST** `/api/daily/create-meeting`

Creates a new video consultation meeting with JWT tokens and expiry controls.

**Request Body:**
```json
{
  "tenantId": "tenant-123",
  "staffId": "staff-456", 
  "patientName": "John Doe",
  "patientId": "patient-789",
  "scheduledTime": "2024-01-15T10:00:00.000Z",
  "duration": 30,
  "notes": "Optional consultation notes"
}
```

**Response:**
```json
{
  "success": true,
  "meetingId": "507f1f77bcf86cd799439011",
  "roomName": "vet-consultation-tenant-123-1705315200000",
  "roomUrl": "https://yourdomain.daily.co/vet-consultation-tenant-123-1705315200000",
  "staffToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "patientToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scheduledTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T10:30:00.000Z",
  "duration": 30,
  "tokenExpiry": "2024-01-15T10:30:00.000Z",
  "tokenNotBefore": "2024-01-15T09:45:00.000Z"
}
```

### 2. Get Meeting Token

**POST** `/api/daily/get-meeting-token`

Retrieves a valid JWT token for joining a meeting.

**Request Body:**
```json
{
  "meetingId": "507f1f77bcf86cd799439011",
  "userId": "staff-456",
  "userType": "staff"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomUrl": "https://yourdomain.daily.co/vet-consultation-tenant-123-1705315200000",
  "roomName": "vet-consultation-tenant-123-1705315200000",
  "userName": "Dr. staff-456",
  "meetingData": {
    "scheduledTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "duration": 30,
    "patientName": "John Doe"
  }
}
```

### 3. List Meetings

**GET** `/api/daily/meetings/:tenantId/:staffId?status=all`

Lists all meetings for a specific tenant and staff member.

**Response:**
```json
{
  "success": true,
  "meetings": [
    {
      "id": "507f1f77bcf86cd799439011",
      "roomName": "vet-consultation-tenant-123-1705315200000",
      "patientName": "John Doe",
      "patientId": "patient-789",
      "scheduledTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-15T10:30:00.000Z",
      "duration": 30,
      "status": "scheduled",
      "roomUrl": "https://yourdomain.daily.co/vet-consultation-tenant-123-1705315200000",
      "tokenExpiry": "2024-01-15T10:30:00.000Z",
      "tokenNotBefore": "2024-01-15T09:45:00.000Z"
    }
  ]
}
```

### 4. Update Meeting Status

**PATCH** `/api/daily/meetings/:meetingId/status`

Updates the status of a meeting.

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Valid Status Values:**
- `scheduled`
- `in-progress`
- `completed`
- `cancelled`

### 5. Delete Meeting

**DELETE** `/api/daily/meetings/:meetingId`

Deletes a meeting and cleans up the Daily.co room.

### 6. Validate Token

**POST** `/api/daily/validate-token`

Validates a JWT token and returns its decoded information.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## JWT Token Structure

### Token Payload

```json
{
  "aud": "daily",
  "iss": "your_daily_api_key",
  "sub": "room-name",
  "room": "room-name",
  "exp": 1705316400,
  "nbf": 1705315500,
  "user_name": "Dr. Smith",
  "user_id": "tenant-123-staff-456",
  "tenant_id": "tenant-123",
  "staff_id": "staff-456",
  "meeting_id": "507f1f77bcf86cd799439011",
  "eject_at_token_exp": true,
  "eject_after_elapsed": 1800,
  "permissions": ["send", "recv", "write", "admin"]
}
```

### Token Properties

| Property | Description | Example |
|----------|-------------|---------|
| `aud` | Audience (always "daily") | `"daily"` |
| `iss` | Issuer (your API key) | `"your_api_key"` |
| `sub` | Subject (room name) | `"vet-consultation-123"` |
| `room` | Room name | `"vet-consultation-123"` |
| `exp` | Expiration timestamp | `1705316400` |
| `nbf` | Not before timestamp | `1705315500` |
| `user_name` | Display name | `"Dr. Smith"` |
| `user_id` | Unique user identifier | `"tenant-123-staff-456"` |
| `tenant_id` | Tenant identifier | `"tenant-123"` |
| `staff_id` | Staff identifier | `"staff-456"` |
| `meeting_id` | Meeting identifier | `"507f1f77bcf86cd799439011"` |
| `eject_at_token_exp` | Auto-eject at expiry | `true` |
| `eject_after_elapsed` | Eject after seconds | `1800` |
| `permissions` | User permissions | `["send", "recv", "write"]` |

### Time Controls

- **`exp`**: Unix timestamp when the token expires
- **`nbf`**: Unix timestamp when the token becomes valid (15 minutes before meeting)
- **`eject_at_token_exp`**: Automatically remove user when token expires
- **`eject_after_elapsed`**: Remove user after specified seconds in meeting

## Frontend Integration

### React Component Usage

```jsx
import VideoConsultationDaily from './components/appointments/VideoConsultation';

// In your Dashboard component
<VideoConsultationDaily 
  tenantId={session.tenant_id} 
  staffId={session.staff_id} 
/>
```

### Joining a Video Call

```javascript
// Load Daily.co SDK
const script = document.createElement('script');
script.src = 'https://unpkg.com/@daily-co/daily-js';
document.head.appendChild(script);

// Join with token
const callFrame = window.DailyIframe.createFrame(
  document.getElementById('video-container'),
  { iframeStyle: { width: '100%', height: '600px' } }
);

await callFrame.join({
  url: roomUrl,
  token: jwtToken
});
```

## Database Schema

### Daily Meetings Collection

```javascript
{
  _id: ObjectId,
  tenantId: String,
  staffId: String,
  patientName: String,
  patientId: String,
  roomName: String,
  scheduledTime: Date,
  endTime: Date,
  duration: Number,
  status: String, // 'scheduled', 'in-progress', 'completed', 'cancelled'
  createdAt: Date,
  updatedAt: Date,
  tokenExpiry: Number, // Unix timestamp
  tokenNotBefore: Number, // Unix timestamp
  ejectAfterElapsed: Number, // Seconds
  staffToken: String, // JWT token
  patientToken: String, // JWT token
  roomUrl: String,
  dailyRoomId: String,
  notes: String
}
```

## Security Features

### Multi-tenant Isolation

- All meetings are scoped by `tenantId` and `staffId`
- Tokens include tenant and staff identifiers
- API endpoints validate tenant access

### Token Security

- JWT tokens are signed with your Daily.co API key
- Tokens have strict time limits
- Automatic ejection prevents unauthorized access
- Role-based permissions (staff vs patient)

### Room Security

- Private rooms with token-based access
- Automatic room expiration
- Cloud recording enabled
- Chat functionality available

## Testing

### Test JWT Generation

```bash
cd server
node test-daily-integration.js
```

### Test API Endpoints

```bash
# Create a meeting
curl -X POST http://localhost:3001/api/daily/create-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant-123",
    "staffId": "test-staff-456",
    "patientName": "Test Patient",
    "patientId": "patient-789",
    "scheduledTime": "2024-01-15T10:00:00.000Z",
    "duration": 30
  }'

# Get meeting token
curl -X POST http://localhost:3001/api/daily/get-meeting-token \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "meeting_id_from_above",
    "userId": "test-staff-456",
    "userType": "staff"
  }'
```

## Error Handling

### Common Errors

| Error | Description | Solution |
|-------|-------------|----------|
| `Meeting has expired` | Token expiry time passed | Create new meeting |
| `Meeting has not started yet` | Before `nbf` time | Wait until meeting time |
| `Invalid token format` | Malformed JWT | Regenerate token |
| `Daily.co SDK not loaded` | Script not loaded | Check script loading |

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Best Practices

### Meeting Scheduling

1. **Set realistic durations** (15-60 minutes)
2. **Allow buffer time** (15 minutes before meeting starts)
3. **Use descriptive room names** with tenant/staff identifiers
4. **Include patient information** for tracking

### Token Management

1. **Never expose API keys** in frontend code
2. **Generate tokens server-side** only
3. **Use short expiry times** for security
4. **Validate tokens** before use

### Room Management

1. **Clean up expired rooms** automatically
2. **Monitor room usage** for billing
3. **Enable recording** for medical records
4. **Use private rooms** for patient privacy

## Troubleshooting

### Token Issues

- Verify `DAILY_API_KEY` is correct
- Check token expiry times
- Ensure proper JWT signing algorithm (HS256)

### Connection Issues

- Verify Daily.co account is active
- Check network connectivity
- Ensure room URLs are accessible

### Frontend Issues

- Verify Daily.co SDK is loaded
- Check browser console for errors
- Ensure proper iframe container exists

## Support

For Daily.co specific issues:
- [Daily.co Documentation](https://docs.daily.co)
- [Daily.co API Reference](https://docs.daily.co/reference)
- [Daily.co Support](https://www.daily.co/support)

For integration issues:
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Test JWT token generation with the test script 