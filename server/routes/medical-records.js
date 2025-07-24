import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router();

// GET a medical record by ID
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const record = await db.collection('medical_records').findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json(record);
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
      { $set: req.body }
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
    const { date, notes } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });
    const followup = {
      id: `fu_${Date.now()}`,
      date,
      notes: notes || "",
      created_at: new Date()
    };
    const result = await db.collection('medical_records').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { followups: followup } }
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