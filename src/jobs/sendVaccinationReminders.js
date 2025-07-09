import { MongoClient, ObjectId } from 'mongodb';
import dayjs from 'dayjs';

// Config
const REMINDER_DAYS = [14, 7, 3];          // days before due date
const FROM_NAME = "VetVault";

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://publicapi.myoperator.co/chat/messages';
const WHATSAPP_TOKEN = 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
const COMPANY_ID = '685ef0684b5ee840';
const PHONE_NUMBER_ID = '697547396774899';

// Send WhatsApp message function with tenant details
async function sendWhatsAppMessage(phone, message, customerName, tenantDetails) {
  try {
    // Extract phone number (remove country code if present)
    let phoneNumber = phone;
    if (phoneNumber.startsWith('+91')) {
      phoneNumber = phoneNumber.substring(3);
    } else if (phoneNumber.startsWith('91')) {
      phoneNumber = phoneNumber.substring(2);
    }
    
    // Prepare the message payload with tenant details
    const payload = {
      phone_number_id: PHONE_NUMBER_ID,
      customer_country_code: "91",
      customer_number: phoneNumber,
      data: {
        type: "template",
        context: {
          template_name: "vaccination_reminder",
          language: "en",
          body: {
            "1": customerName || "Pet Owner", // {{1}}
            "2": message,                     // {{2}}
            "3": tenantDetails.clinicName || FROM_NAME, // {{3}} - Clinic name
            "4": tenantDetails.doctorName || "Dr. Ravi", // {{4}} - Doctor name
            "5": tenantDetails.contactPhone || "+91 1234567890" // {{5}} - Contact phone
          }
        }
      },
      reply_to: null,
      myop_ref_id: `vaccination_reminder_${Date.now()}`
    };
    
    console.log('Sending vaccination reminder:', { 
      phone: phoneNumber, 
      customerName, 
      clinic: tenantDetails.clinicName,
      doctor: tenantDetails.doctorName 
    });
    
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'X-MYOP-COMPANY-ID': COMPANY_ID
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.message || response.statusText}`);
    }
    
    console.log('WhatsApp reminder sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp reminder:', error);
    throw error;
  }
}

export async function runVaccinationReminders() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    const today = dayjs().startOf("day");
    console.log(`Running vaccination reminders for ${today.format('YYYY-MM-DD')}`);

    // Get all pets with vaccination dates
    const pets = await db.collection("pets").find({
      next_vaccination_date: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Found ${pets.length} pets with vaccination dates`);

    let remindersSent = 0;
    let errors = 0;

    for (const pet of pets) {
      try {
        const due = dayjs(pet.next_vaccination_date).startOf("day");
        const daysUntil = due.diff(today, "day");          // positive if in future

        if (!REMINDER_DAYS.includes(daysUntil)) continue;  // not our window

        const field = `reminder_${daysUntil}d_sent`;
        if (pet[field]) {
          console.log(`Reminder already sent for ${pet.name} (${daysUntil} days)`);
          continue;                          // already sent
        }

        // Get owner information
        let ownerName = "Pet Owner";
        let ownerPhone = pet.owner_phone;
        
        if (pet.owner_id) {
          try {
            const owner = await db.collection("clients").findOne({ 
              _id: new ObjectId(pet.owner_id) 
            });
            if (owner) {
              ownerName = `${owner.first_name} ${owner.last_name}`.trim();
              ownerPhone = owner.phone || pet.owner_phone;
            }
          } catch (ownerError) {
            console.warn(`Could not fetch owner for pet ${pet.name}:`, ownerError.message);
          }
        }

        if (!ownerPhone) {
          console.warn(`No phone number for pet ${pet.name}, skipping reminder`);
          continue;
        }

        // Get tenant information
        let tenantDetails = {
          clinicName: FROM_NAME,
          doctorName: "Dr. Ravi",
          contactPhone: "+91 1234567890"
        };
        
        if (pet.tenant_id) {
          try {
            const tenant = await db.collection("tenants").findOne({ 
              _id: new ObjectId(pet.tenant_id) 
            });
            if (tenant) {
              tenantDetails = {
                clinicName: tenant.name || tenant.clinic_name || FROM_NAME,
                doctorName: tenant.doctor_name || tenant.doctorName || "Dr. Ravi",
                contactPhone: tenant.phone || tenant.contact_phone || "+91 1234567890"
              };
              console.log(`Found tenant details for ${pet.name}:`, tenantDetails.clinicName);
            }
          } catch (tenantError) {
            console.warn(`Could not fetch tenant for pet ${pet.name}:`, tenantError.message);
          }
        }

        // Compose message
        const msg = `${pet.name}'s vaccination is due on ${due.format("DD MMM YYYY")}. Please schedule a visit.`;

        // Send WhatsApp reminder with tenant details
        await sendWhatsAppMessage(ownerPhone, msg, ownerName, tenantDetails);

        // Mark as sent
        await db.collection("pets").updateOne(
          { _id: new ObjectId(pet._id) },
          { $set: { [field]: new Date() } }
        );

        console.log(`✅ Reminder sent for ${pet.name} (${daysUntil} days until due)`);
        remindersSent++;

      } catch (error) {
        console.error(`❌ Error processing pet ${pet.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Vaccination Reminders Summary:`);
    console.log(`✅ Reminders sent: ${remindersSent}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📅 Next reminder windows: ${REMINDER_DAYS.join(', ')} days before due date`);

  } catch (error) {
    console.error('Error running vaccination reminders:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVaccinationReminders().then(() => {
    console.log("Vaccination reminders job finished");
    process.exit(0);
  }).catch((error) => {
    console.error("Vaccination reminders job failed:", error);
    process.exit(1);
  });
} 