# Automated Vaccination Reminders System

## Overview

The automated vaccination reminders system sends WhatsApp notifications to pet owners at strategic intervals before their pets' vaccination due dates. This ensures timely vaccinations and better pet health management.

## Features

### 🎯 **Core Functionality**
- **Automated Scheduling**: Runs daily at 9:00 AM IST
- **Multiple Reminder Windows**: 14, 7, and 3 days before due date
- **Duplicate Prevention**: Tracks sent reminders to avoid duplicates
- **WhatsApp Integration**: Uses MyOperator WhatsApp Business API
- **Tenant-Aware**: Dynamically fetches clinic details for each pet
- **Error Handling**: Comprehensive error handling and logging
- **Owner Lookup**: Automatically fetches owner details from clients collection

### 📅 **Reminder Schedule**
- **T-14 days**: Early reminder for planning
- **T-7 days**: Follow-up reminder
- **T-3 days**: Final reminder before due date

## Implementation Details

### 📁 **Files Created**

#### New Files:
- `src/jobs/sendVaccinationReminders.js` - Main vaccination reminders job
- `scripts/run-vaccination-reminders.js` - Manual execution script
- `VACCINATION_REMINDERS.md` - This documentation

#### Modified Files:
- `server.js` - Added cron job scheduling
- `package.json` - Added dependencies and scripts

### 🔧 **Configuration**

#### Environment Variables:
```bash
MONGODB_URI=mongodb://localhost:27017
DB_NAME=vet-cares
```

#### WhatsApp API Configuration:
```javascript
const WHATSAPP_API_URL = 'https://publicapi.myoperator.co/chat/messages';
const WHATSAPP_TOKEN = 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
const COMPANY_ID = '685ef0684b5ee840';
const PHONE_NUMBER_ID = '697547396774899';
```

#### Reminder Settings:
```javascript
const REMINDER_DAYS = [14, 7, 3];  // days before due date
const FROM_NAME = "VetVault";
```

## Database Schema

### Pet Collection Fields:
```javascript
{
  _id: ObjectId,
  name: String,
  next_vaccination_date: Date,
  owner_id: ObjectId,        // Reference to clients collection
  owner_phone: String,       // Fallback phone number
  tenant_id: ObjectId,       // Reference to tenants collection
  reminder_14d_sent: Date,   // Tracks if 14-day reminder sent
  reminder_7d_sent: Date,    // Tracks if 7-day reminder sent
  reminder_3d_sent: Date,    // Tracks if 3-day reminder sent
  // ... other pet fields
}
```

### Client Collection Fields:
```javascript
{
  _id: ObjectId,
  first_name: String,
  last_name: String,
  phone: String,
  // ... other client fields
}
```

### Tenant Collection Fields:
```javascript
{
  _id: ObjectId,
  name: String,              // Clinic name (e.g., "VetVault")
  clinic_name: String,       // Alternative clinic name field
  doctor_name: String,       // Doctor name (e.g., "Dr. Ravi")
  doctorName: String,        // Alternative doctor name field
  phone: String,             // Contact phone number
  contact_phone: String,     // Alternative contact phone field
  slug: String,              // Tenant slug
  subdomain: String,         // Tenant subdomain
  status: String,            // Tenant status
  // ... other tenant fields
}
```

## Usage

### 🚀 **Automatic Execution**

The system runs automatically when the server starts:

```bash
npm run server
```

**Cron Schedule**: Daily at 9:00 AM IST (`0 9 * * *`)

### 🛠 **Manual Execution**

Run reminders manually:

```bash
# Using npm script
npm run vaccination-reminders

# Direct execution
node scripts/run-vaccination-reminders.js

# Import and run programmatically
import { runVaccinationReminders } from './src/jobs/sendVaccinationReminders.js';
await runVaccinationReminders();
```

### 📊 **Monitoring**

Check server logs for execution status:

```bash
# View server logs
tail -f server.log

# Check cron job execution
grep "vaccination reminders" server.log
```

## WhatsApp Message Format

### Template: `vaccination_reminder`
```
🐾 Hi {{1}},

{{2}}

Best regards,
{{3}}
{{4}}
{{5}}
```

### Example Message:
```
🐾 Hi John Doe,

Buddy's vaccination is due on 15 Dec 2024. Please schedule a visit.

Best regards,
VetVault Test Clinic
Dr. Ravi Kumar
+91 8296143115
```

## Error Handling

### 🚨 **Common Scenarios**
- **No phone number**: Pet has no owner phone number
- **Owner not found**: Client record doesn't exist
- **WhatsApp API error**: Network or API issues
- **Database connection**: MongoDB connection issues

### 🛠 **Error Recovery**
- Individual pet errors don't stop the entire job
- Detailed error logging for debugging
- Graceful fallbacks for missing data
- Retry mechanisms for API failures

## Testing

### 🧪 **Test Scenarios**

1. **Valid Reminder**: Pet with due date in 7 days
2. **No Phone**: Pet without owner phone number
3. **Already Sent**: Pet with reminder already marked as sent
4. **Past Due**: Pet with vaccination date in the past
5. **No Owner**: Pet without linked owner

### 🎯 **Manual Testing**

```bash
# Test with specific date
# Modify the job to use a specific date instead of today
const testDate = dayjs('2024-12-15'); // Test date
const today = testDate.startOf("day");
```

## Dependencies

### 📦 **Required Packages**
- `node-cron: ^3.0.3` - Cron job scheduling
- `dayjs: ^1.11.10` - Date manipulation
- `mongodb: ^6.3.0` - Database operations
- `node-fetch: ^2.7.0` - HTTP requests

### 🔗 **External Services**
- **MyOperator WhatsApp API**: Message sending
- **MongoDB**: Pet and client data storage

## Security Considerations

### 🔐 **Data Protection**
- API credentials stored in backend only
- No sensitive data in frontend
- Secure database connections
- Error messages don't expose sensitive information

### 📝 **Audit Trail**
- All sent reminders are logged
- Database tracks sent reminders
- Console logging for debugging
- Error tracking for failed attempts

## Troubleshooting

### 🔍 **Common Issues**

1. **Job not running**:
   - Check server is running
   - Verify cron schedule
   - Check timezone settings

2. **No reminders sent**:
   - Verify pets have `next_vaccination_date`
   - Check phone numbers are valid
   - Review WhatsApp API credentials

3. **Duplicate reminders**:
   - Check reminder tracking fields
   - Verify date calculations
   - Review timezone handling

### 🛠 **Debug Steps**

1. **Check pet data**:
   ```javascript
   db.pets.find({ next_vaccination_date: { $exists: true } })
   ```

2. **Verify reminder tracking**:
   ```javascript
   db.pets.find({ reminder_7d_sent: { $exists: true } })
   ```

3. **Test WhatsApp API**:
   ```bash
   curl -X POST https://publicapi.myoperator.co/chat/messages \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   ```

## Future Enhancements

### 🔮 **Planned Features**
- **Email Fallback**: Send email if WhatsApp fails
- **SMS Integration**: SMS reminders as backup
- **Custom Templates**: Configurable message templates
- **Bulk Operations**: Send reminders in batches
- **Analytics**: Track reminder effectiveness
- **Webhooks**: Real-time delivery status

### 🔧 **Technical Improvements**
- **Queue System**: Use Redis for job queuing
- **Retry Logic**: Automatic retry for failed sends
- **Rate Limiting**: Respect WhatsApp API limits
- **Monitoring**: Dashboard for reminder status
- **Notifications**: Admin alerts for failures

## Support

For issues or questions about the vaccination reminders system:

1. **Check server logs** for detailed error messages
2. **Verify pet data** has correct vaccination dates
3. **Test WhatsApp API** credentials and connectivity
4. **Review cron schedule** and timezone settings
5. **Check database connections** and permissions

---

**Status**: ✅ **IMPLEMENTED** - Ready for production deployment

**Last Updated**: December 2024 