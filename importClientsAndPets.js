const fs = require('fs');
const csv = require('csv-parser');
const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIG ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vet-cares';
const CSV_FILE = 'clients.csv';

// --- USAGE ---
// node importClientsAndPets.js <tenantId>

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: node importClientsAndPets.js <tenantId>');
  process.exit(1);
}

function splitName(fullName) {
  if (!fullName) return { first_name: '', last_name: '' };
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
  };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const clientsCol = db.collection('clients');
    const petsCol = db.collection('pets');

    const results = [];
    fs.createReadStream(CSV_FILE)
      .pipe(csv({ separator: ',' }))
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let petCounter = 1;
        for (const row of results) {
          const owner = row['Owner ']?.trim();
          const phone = row['Ph. No']?.trim();
          const petName = row['Pet name']?.trim();
          if (!owner || !phone || !petName) {
            console.warn('Skipping row due to missing data:', row);
            continue;
          }
          // Split owner name
          const { first_name, last_name } = splitName(owner);
          const now = new Date();
          // Insert client
          const clientDoc = {
            tenant_id: tenantId,
            phone: phone,
            first_name,
            last_name,
            email: '',
            address: '',
            status: 'active',
            created_at: now,
            updated_at: now,
            profile_completed: true,
          };
          const clientRes = await clientsCol.insertOne(clientDoc);
          // Generate pet_id (D001, D002, ...)
          const pet_id = `D${String(petCounter).padStart(3, '0')}`;
          petCounter++;
          // Insert pet
          const petDoc = {
            tenant_id: tenantId,
            pet_id: pet_id,
            name: petName,
            species: '',
            breed: '',
            color: '',
            gender: '',
            birth_date: '',
            microchip_id: '',
            allergies: '',
            special_notes: '',
            photo_url: '',
            client_id: clientRes.insertedId,
            created_date: now,
            updated_date: now,
          };
          await petsCol.insertOne(petDoc);
          console.log(`Created client '${owner}' and pet '${petName}' (pet_id: ${pet_id})`);
        }
        console.log('Import complete.');
        process.exit(0);
      });
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main(); 