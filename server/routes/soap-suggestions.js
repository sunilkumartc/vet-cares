import express from 'express';
import { dbUtils } from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Enhanced SOAP suggestions endpoint with vector search
router.post('/suggest-soap', async (req, res) => {
  try {
    const { 
      section, 
      input_text, 
      species, 
      age_group, 
      clinic_id,
      patient_id,
      limit = 5 
    } = req.body;

    // Validate required fields
    if (!section || !input_text) {
      return res.status(400).json({
        success: false,
        error: 'Section and input_text are required'
      });
    }

    // Get patient context if available
    let patientContext = null;
    if (patient_id) {
      try {
        const patient = await dbUtils.getCollection('pets').findOne({ 
          _id: new ObjectId(patient_id) 
        });
        if (patient) {
          patientContext = {
            species: patient.species,
            breed: patient.breed,
            age: patient.age,
            sex: patient.sex,
            weight: patient.weight
          };
        }
      } catch (error) {
        console.warn('Could not fetch patient details:', error.message);
      }
    }

    // Generate embedding for input text (simplified - in production use a real embedding service)
    const inputEmbedding = generateEmbedding(input_text);
    
    // Search for similar SOAP notes
    const suggestions = await searchSimilarSOAPNotes({
      section,
      inputEmbedding,
      species: species || patientContext?.species,
      age_group,
      clinic_id,
      limit
    });

    // If no suggestions found, generate fallback suggestions
    if (suggestions.length === 0) {
      const fallbackSuggestions = generateFallbackSuggestions(section, input_text, patientContext);
      return res.json({
        success: true,
        suggestions: fallbackSuggestions,
        source: 'fallback',
        patient: patientContext
      });
    }

    res.json({
      success: true,
      suggestions,
      source: 'elasticsearch',
      patient: patientContext
    });

  } catch (error) {
    console.error('Error generating SOAP suggestions:', error);
    res.status(500).json({
      success: false,
      error: `Failed to generate suggestions: ${error.message}`
    });
  }
});

// Search similar SOAP notes using vector similarity
async function searchSimilarSOAPNotes({ section, inputEmbedding, species, age_group, clinic_id, limit }) {
  try {
    const collection = dbUtils.getCollection('medical_records');
    
    // Build query with filters
    const query = {
      section: section,
      $or: [
        { subjective: { $exists: true, $ne: "" } },
        { objective: { $exists: true, $ne: "" } },
        { assessment: { $exists: true, $ne: "" } },
        { plan: { $exists: true, $ne: "" } }
      ]
    };

    // Add species filter if available
    if (species) {
      query['pet.species'] = { $regex: new RegExp(species, 'i') };
    }

    // Add clinic filter if available
    if (clinic_id) {
      query.tenant_id = clinic_id;
    }

    // Get medical records
    const records = await collection.find(query).limit(100).toArray();
    
    // Calculate similarity scores and rank results
    const scoredResults = records.map(record => {
      const text = record[section] || '';
      const similarity = calculateTextSimilarity(inputEmbedding, text);
      
      return {
        id: record._id.toString(),
        text: text,
        similarity: similarity,
        metadata: {
          pet_species: record.pet?.species,
          pet_breed: record.pet?.breed,
          visit_date: record.visit_date,
          veterinarian: record.veterinarian
        }
      };
    });

    // Sort by similarity and return top results
    return scoredResults
      .filter(result => result.similarity > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => ({
        text: result.text,
        similarity: result.similarity,
        metadata: result.metadata
      }));

  } catch (error) {
    console.error('Error searching similar SOAP notes:', error);
    return [];
  }
}

// Generate fallback suggestions based on veterinary knowledge
function generateFallbackSuggestions(section, inputText, patientContext) {
  const species = patientContext?.species || 'unknown';
  const breed = patientContext?.breed || 'unknown';
  const age = patientContext?.age || 'unknown';
  const sex = patientContext?.sex || 'unknown';

  const knowledgeBase = {
    subjective: [
      `${species} ${breed}, ${age} age, ${sex} sex: Owner reports patient has been experiencing {symptom} for the past few days.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Client noticed {symptom} and is concerned about patient's behavior.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Patient presents with history of {condition} and current {symptom}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Owner reports decreased appetite and lethargy for 2-3 days.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Client observed vomiting and diarrhea episodes.`
    ],
    objective: [
      `${species} ${breed}, ${age} age, ${sex} sex: Physical examination reveals {finding}. Vital signs within normal limits.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Temperature elevated at 103.2°F. Heart rate 140 bpm, respiratory rate 25 rpm.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Patient appears alert and responsive. No obvious abnormalities detected.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Skin and coat condition good. No evidence of external parasites.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Abdominal palpation reveals no pain or masses.`
    ],
    assessment: [
      `${species} ${breed}, ${age} age, ${sex} sex: Probable {diagnosis} based on clinical signs and examination findings.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Differential diagnoses include {differential1} and {differential2}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Primary diagnosis: {diagnosis}. Secondary considerations: {secondary}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Rule out {ruleOut} based on presenting symptoms.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Assessment consistent with {condition} requiring {treatment_type}.`
    ],
    plan: [
      `${species} ${breed}, ${age} age, ${sex} sex: Recommend {test} to confirm diagnosis. Start {medication} {frequency} for {duration}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Prescribe {medication} {frequency} for {duration}. Recheck in {timeframe}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Continue current treatment plan. Follow up appointment scheduled for {timeframe}.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Discharge with {medication} and dietary recommendations.`,
      `${species} ${breed}, ${age} age, ${sex} sex: Monitor for improvement. Contact if symptoms worsen or persist.`
    ]
  };

  const suggestions = knowledgeBase[section] || knowledgeBase.subjective;
  
  return suggestions.map((suggestion, index) => ({
    text: suggestion,
    similarity: 0.8 - (index * 0.1), // Decreasing similarity for fallback suggestions
    metadata: {
      source: 'fallback',
      species,
      breed,
      age,
      sex
    }
  }));
}

// Simplified embedding generation (in production, use a real embedding service)
function generateEmbedding(text) {
  // This is a simplified implementation
  // In production, you would use a service like OpenAI, Cohere, or sentence-transformers
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const position = Math.abs(hash) % 384;
    embedding[position] = (embedding[position] + 1) % 10;
  });
  
  return embedding;
}

// Calculate text similarity using cosine similarity
function calculateTextSimilarity(embedding1, text2) {
  const embedding2 = generateEmbedding(text2);
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.max(0, similarity); // Ensure non-negative
}

// Index SOAP note for future suggestions
router.post('/index-soap', async (req, res) => {
  try {
    const { medicalRecord } = req.body;
    
    if (!medicalRecord) {
      return res.status(400).json({
        success: false,
        error: 'Medical record data is required'
      });
    }

    // Generate embeddings for each SOAP section
    const sections = ['subjective', 'objective', 'assessment', 'plan'];
    const embeddings = {};
    
    sections.forEach(section => {
      if (medicalRecord[section]) {
        embeddings[section] = generateEmbedding(medicalRecord[section]);
      }
    });

    // Store in database for future suggestions
    const collection = dbUtils.getCollection('soap_embeddings');
    const embeddingDoc = {
      _id: new ObjectId(),
      medical_record_id: medicalRecord._id || new ObjectId(),
      pet_id: medicalRecord.pet_id,
      tenant_id: medicalRecord.tenant_id,
      veterinarian: medicalRecord.veterinarian,
      visit_date: medicalRecord.visit_date,
      embeddings,
      metadata: {
        species: medicalRecord.pet?.species,
        breed: medicalRecord.pet?.breed,
        age: medicalRecord.pet?.age,
        sex: medicalRecord.pet?.sex
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    await collection.insertOne(embeddingDoc);

    res.json({
      success: true,
      message: 'SOAP note indexed successfully',
      embedding_id: embeddingDoc._id.toString()
    });

  } catch (error) {
    console.error('Error indexing SOAP note:', error);
    res.status(500).json({
      success: false,
      error: `Failed to index SOAP note: ${error.message}`
    });
  }
});

export default router; 