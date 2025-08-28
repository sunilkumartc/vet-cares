import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router();

// GET medical records by pet ID with filtering
router.get('/pets/:petId/medical-records', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { petId } = req.params;
    const { tenant_id, type } = req.query;

    if (!tenant_id) {
      return res.status(400).json({ success: false, error: 'tenant_id is required' });
    }

    // Build query
    const query = {
      pet_id: petId,
      tenant_id: tenant_id
    };

    // Add type filter if provided
    if (type) {
      query.type = type;
    }

    console.log('Fetching medical records with query:', query);

    const records = await db.collection('medical_records')
      .find(query)
      .sort({ created_date: -1 })
      .toArray();

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET a medical record by ID
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const record = await db.collection('medical_records').findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT (update) a medical record by ID
router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.collection('medical_records').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updated_date: new Date() } }
    );
    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST a follow-up to a medical record
router.post('/:id/followups', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { date, notes, weight, medication_name, dosage, frequency } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });
    
    const followup = {
      id: `fu_${Date.now()}`,
      date,
      notes: notes || "",
      weight: weight || null,
      medication_name: medication_name || null,
      dosage: dosage || null,
      frequency: frequency || null,
      created_at: new Date()
    };

    const result = await db.collection('medical_records').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $push: { followups: followup },
        $set: { updated_date: new Date() }
      }
    );

    if (result.modifiedCount === 1) {
      res.json({ success: true, followup });
    } else {
      res.status(404).json({ success: false, error: 'Medical record not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all follow-ups for a medical record
router.get('/:id/followups', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const record = await db.collection('medical_records').findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, followups: record.followups || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
