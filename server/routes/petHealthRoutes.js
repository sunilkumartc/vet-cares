import express from "express"
import { MongoClient, ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

const router = express.Router()

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      })
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { userId: decoded.userId }
    next()
  } catch (error) {
    console.error("JWT verification error:", error)
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
  }
}

// Helper function to ensure collection exists
const ensureCollection = async (db, collectionName) => {
  const collections = await db.listCollections({ name: collectionName }).toArray()
  if (collections.length === 0) {
    await db.createCollection(collectionName)
    console.log(`Created collection: ${collectionName}`)
  }
}

// GET /api/pets/:petId/vaccinations - Get vaccinations for a pet
router.get("/pets/:petId/vaccinations", authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params
    const { tenant_id } = req.query

    console.log('Fetching vaccinations for pet:', petId, 'tenant:', tenant_id)

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID required",
      })
    }

    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db("vet-cares")
    
    // Ensure collection exists
    await ensureCollection(db, "vaccinations")
    const vaccinationsCollection = db.collection("vaccinations")

    const query = {
      pet_id: petId,
      tenant_id: tenant_id,
    }

    const vaccinations = await vaccinationsCollection
      .find(query)
      .sort({ date_administered: -1 })
      .toArray()

    console.log('Found vaccinations:', vaccinations.length)

    const formattedVaccinations = vaccinations.map((vaccination) => ({
      ...vaccination,
      id: vaccination._id.toString(),
    }))

    await client.close()

    res.json({
      success: true,
      data: formattedVaccinations,
    })
  } catch (error) {
    console.error("Get vaccinations error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while retrieving vaccinations",
    })
  }
})

// GET /api/pets/:petId/prescriptions - Get prescriptions for a pet
router.get("/pets/:petId/prescriptions", authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params
    const { tenant_id } = req.query

    console.log('Fetching prescriptions for pet:', petId, 'tenant:', tenant_id)

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID required",
      })
    }

    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db("vet-cares")
    
    // Ensure collection exists
    await ensureCollection(db, "prescriptions")
    const prescriptionsCollection = db.collection("prescriptions")

    const query = {
      pet_id: petId,
      tenant_id: tenant_id,
    }

    const prescriptions = await prescriptionsCollection
      .find(query)
      .sort({ start_date: -1 })
      .toArray()

    console.log('Found prescriptions:', prescriptions.length)

    const formattedPrescriptions = prescriptions.map((prescription) => ({
      ...prescription,
      id: prescription._id.toString(),
    }))

    await client.close()

    res.json({
      success: true,
      data: formattedPrescriptions,
    })
  } catch (error) {
    console.error("Get prescriptions error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while retrieving prescriptions",
    })
  }
})

// POST /api/pets/:petId/prescriptions - Create new prescription
router.post("/pets/:petId/prescriptions", authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params
    const { tenant_id } = req.query
    const prescriptionData = req.body

    console.log('Creating prescription for pet:', petId, 'tenant:', tenant_id)
    console.log('Prescription data:', prescriptionData)

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID required",
      })
    }

    // Validate required fields
    const { medication_name, dosage, frequency, start_date } = prescriptionData
    if (!medication_name || !dosage || !frequency || !start_date) {
      return res.status(400).json({
        success: false,
        message: "Medication name, dosage, frequency, and start date are required",
      })
    }

    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db("vet-cares")
    
    // Ensure collection exists
    await ensureCollection(db, "prescriptions")
    const prescriptionsCollection = db.collection("prescriptions")

    const newPrescription = {
      pet_id: petId,
      tenant_id: tenant_id,
      medication_name,
      dosage,
      frequency,
      start_date,
      end_date: prescriptionData.end_date || null,
      status: prescriptionData.status || 'active',
      notes: prescriptionData.notes || '',
      instructions: prescriptionData.instructions || '',
      veterinarian: prescriptionData.veterinarian || '',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    }

    const result = await prescriptionsCollection.insertOne(newPrescription)

    const createdPrescription = {
      ...newPrescription,
      _id: result.insertedId,
      id: result.insertedId.toString(),
    }

    await client.close()

    console.log('Prescription created successfully:', result.insertedId)

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: createdPrescription,
    })
  } catch (error) {
    console.error("Create prescription error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while creating prescription",
    })
  }
})

// GET /api/pets/:petId/weight-history - Get weight history for a pet
router.get("/pets/:petId/weight-history", authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params
    const { tenant_id } = req.query

    console.log('Fetching weight history for pet:', petId, 'tenant:', tenant_id)

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID required",
      })
    }

    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db("vet-cares")
    
    // Ensure collection exists
    await ensureCollection(db, "weight_records")
    const weightHistoryCollection = db.collection("weight_records")

    const query = {
      pet_id: petId,
      tenant_id: tenant_id,
    }

    const weightHistory = await weightHistoryCollection
      .find(query)
      .sort({ recorded_date: -1 })
      .limit(20)
      .toArray()

    console.log('Found weight records:', weightHistory.length)

    const formattedWeightHistory = weightHistory.map((record) => ({
      ...record,
      id: record._id.toString(),
    }))

    await client.close()

    res.json({
      success: true,
      data: formattedWeightHistory,
    })
  } catch (error) {
    console.error("Get weight history error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while retrieving weight history",
    })
  }
})

// POST /api/pets/:petId/weight-history - Create new weight record
router.post("/pets/:petId/weight-history", authenticateToken, async (req, res) => {
  try {
    const { petId } = req.params
    const { tenant_id } = req.query
    const weightData = req.body

    console.log('Creating weight record for pet:', petId, 'tenant:', tenant_id)
    console.log('Weight data:', weightData)

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID required",
      })
    }

    // Validate required fields
    const { weight, recorded_date } = weightData
    if (!weight || !recorded_date) {
      return res.status(400).json({
        success: false,
        message: "Weight and recorded date are required",
      })
    }

    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db("vet-cares")
    
    // Ensure collection exists
    await ensureCollection(db, "weight_records")
    const weightHistoryCollection = db.collection("weight_records")

    const newWeightRecord = {
      pet_id: petId,
      tenant_id: tenant_id,
      weight: parseFloat(weight),
      recorded_date,
      notes: weightData.notes || '',
      body_condition_score: weightData.body_condition_score || null,
      veterinarian: weightData.veterinarian || '',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    }

    const result = await weightHistoryCollection.insertOne(newWeightRecord)

    const createdWeightRecord = {
      ...newWeightRecord,
      _id: result.insertedId,
      id: result.insertedId.toString(),
    }

    await client.close()

    console.log('Weight record created successfully:', result.insertedId)

    res.status(201).json({
      success: true,
      message: "Weight record created successfully",
      data: createdWeightRecord,
    })
  } catch (error) {
    console.error("Create weight record error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while creating weight record",
    })
  }
})

export default router
