const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vet-cares';

// Sample clinic profile data
const clinicProfileData = {
  clinic_name: "Dr. Ravi Pet Care Center",
  tagline: "Where every pet is family",
  address: "No. 32, 4th temple Street road, 15th Cross Rd, Malleshwaram, Bengaluru, Karnataka 560003",
  phone: "+91 82961 43115",
  email: "info@ravipetcare.com",
  website: "https://ravipetcare.com",
  description: "Dr. Ravi Pet Care Center is a state-of-the-art veterinary facility dedicated to providing comprehensive care for pets. Our team of experienced veterinarians and staff are passionate about animal health and committed to building lasting relationships with pet families. We offer a wide range of services including preventive care, emergency treatment, surgery, and specialized care for various pet species.",
  team_members: [
    {
      id: 1,
      name: "Dr. Ravi Kumar",
      title: "Chief Veterinarian & Clinic Director",
      specialization: "Small Animal Medicine & Surgery",
      qualifications: "BVSc & AH, MVSc (Veterinary Medicine)",
      experience: "8+ years",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop",
      bio: "Dr. Ravi is passionate about providing comprehensive veterinary care with a focus on preventive medicine and advanced surgical procedures. He believes in building strong relationships with pet families and ensuring the highest quality of care for every patient.",
      expertise: ["Internal Medicine", "Soft Tissue Surgery", "Emergency Care", "Preventive Medicine"]
    },
    {
      id: 2,
      name: "Dr. Bindu Sharma",
      title: "Associate Veterinarian",
      specialization: "Dermatology & Nutrition",
      qualifications: "BVSc & AH, PG Diploma in Pet Nutrition",
      experience: "15+ years",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop",
      bio: "Dr. Bindu specializes in veterinary dermatology and pet nutrition. Her gentle approach and expertise in skin conditions and dietary management have helped countless pets achieve optimal health and comfort.",
      expertise: ["Dermatology", "Allergy Management", "Pet Nutrition", "Wellness Exams"]
    },
    {
      id: 3,
      name: "Praveen Kumar",
      title: "Veterinary Technician & Practice Manager",
      specialization: "Patient Care & Clinical Support",
      qualifications: "Diploma in Veterinary Science, Certified Vet Tech",
      experience: "6+ years",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
      bio: "Praveen ensures smooth clinic operations while providing exceptional patient care. His expertise in handling animals and supporting veterinary procedures makes him an invaluable part of our team.",
      expertise: ["Patient Handling", "Laboratory Procedures", "Surgical Assistance", "Client Relations"]
    }
  ],
  success_stories: [
    {
      id: 1,
      petName: "Buddy",
      ownerName: "Priya Sharma",
      story: "Buddy came to us with severe skin allergies. After our comprehensive treatment plan and dietary changes, he's now completely healthy and playful!",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=800&auto=format&fit=crop",
      treatment: "Allergy Treatment & Nutrition Plan",
      rating: 5
    },
    {
      id: 2,
      petName: "Whiskers",
      ownerName: "Raj Patel",
      story: "Our cat Whiskers had a complex surgery that saved her life. The care and attention from our team was exceptional throughout the recovery.",
      image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=800&auto=format&fit=crop",
      treatment: "Emergency Surgery & Recovery",
      rating: 5
    },
    {
      id: 3,
      petName: "Rocky",
      ownerName: "Anjali Reddy",
      story: "Rocky was overweight and lethargic. With our nutrition plan and regular check-ups, he's now the energetic dog we remember!",
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800&auto=format&fit=crop",
      treatment: "Weight Management & Wellness",
      rating: 5
    }
  ]
};

async function setupClinicProfile() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const tenantsCollection = db.collection('tenants');
    
    // Get the default tenant (or first tenant)
    const tenant = await tenantsCollection.findOne({ slug: 'default' }) || 
                   await tenantsCollection.findOne({});
    
    if (!tenant) {
      console.log('No tenant found. Please create a tenant first.');
      return;
    }
    
    console.log(`Setting up clinic profile for tenant: ${tenant.name} (${tenant._id})`);
    
    // Update tenant with clinic profile data
    const result = await tenantsCollection.updateOne(
      { _id: tenant._id },
      { 
        $set: {
          ...clinicProfileData,
          updated_date: new Date()
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('Clinic profile updated successfully!');
      console.log('Updated fields:', Object.keys(clinicProfileData));
    } else {
      console.log('Failed to update clinic profile');
    }
    
  } catch (error) {
    console.error('Error setting up clinic profile:', error);
  } finally {
    await client.close();
  }
}

// Run the script
setupClinicProfile().catch(console.error); 