import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

let client;

async function sendVaccinationReminders() {
  try {
    console.log('Starting vaccination reminder job...');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Get current date
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Find pets with vaccinations due in the next 7 days
    const pets = await db.collection('pets').find({
      'vaccinations.due_date': {
        $gte: today.toISOString(),
        $lte: nextWeek.toISOString()
      }
    }).toArray();
    
    console.log(`Found ${pets.length} pets with vaccinations due`);
    
    // Group pets by client
    const clientPets = {};
    for (const pet of pets) {
      if (!clientPets[pet.client_id]) {
        clientPets[pet.client_id] = [];
      }
      clientPets[pet.client_id].push(pet);
    }
    
    // Send reminders for each client
    for (const [clientId, pets] of Object.entries(clientPets)) {
      try {
        // Get client details
        const client = await db.collection('clients').findOne({ _id: new ObjectId(clientId) });
        if (!client || !client.email) {
          console.log(`Skipping client ${clientId} - no email found`);
          continue;
        }
        
        // Prepare vaccination list
        const vaccinations = pets.flatMap(pet => 
          pet.vaccinations
            .filter(vacc => {
              const dueDate = new Date(vacc.due_date);
              return dueDate >= today && dueDate <= nextWeek;
            })
            .map(vacc => ({
              pet_name: pet.name,
              vaccine_name: vacc.name,
              due_date: vacc.due_date
            }))
        );
        
        if (vaccinations.length === 0) continue;
        
        // Send email reminder (implement your email service here)
        await sendEmailReminder(client.email, client.name, vaccinations);
        
        // Log the reminder
        await db.collection('reminders').insertOne({
          client_id: new ObjectId(clientId),
          type: 'vaccination',
          pets: pets.map(p => p._id),
          vaccinations: vaccinations,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
        
        console.log(`Sent vaccination reminder to ${client.email}`);
        
      } catch (error) {
        console.error(`Error sending reminder to client ${clientId}:`, error);
      }
    }
    
    console.log('Vaccination reminder job completed');
    
  } catch (error) {
    console.error('Error in vaccination reminder job:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function sendEmailReminder(email, clientName, vaccinations) {
  // Implement your email service here
  // This is a placeholder - replace with your actual email service
  console.log(`Would send email to ${email} for ${vaccinations.length} vaccinations`);
  
  // Example using a hypothetical email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'Vaccination Reminder',
  //   template: 'vaccination-reminder',
  //   data: { clientName, vaccinations }
  // });
}

// Export for use in cron jobs or manual execution
export { sendVaccinationReminders };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendVaccinationReminders()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
} 