import { z } from 'zod';
import { esClient } from '../../../lib/esClient.js';
import { getMongoClient } from '../../../lib/mongoClient.js';
import { ObjectId } from 'mongodb';

// Input validation schema
const autocompleteSchema = z.object({
  field: z.enum(['subjective', 'objective', 'assessment', 'plan']),
  currentText: z.string().min(1).max(1000),
  patient: z.object({
    id: z.string().optional(),
    species: z.string().optional(),
    breed: z.string().optional(),
    age: z.number().optional(),
    sex: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
});

export async function autocompleteHandler(req, res) {
  try {
    // Validate input
    const body = autocompleteSchema.parse(req.body);
    
    // Get patient details if ID is provided
    let patientData = body.patient;
    if (body.patient?.id) {
      try {
        const mongoClient = await getMongoClient();
        const db = mongoClient.db('vet-cares');
        const pet = await db.collection("pets").findOne({ _id: new ObjectId(body.patient.id) });
        if (pet) {
          patientData = {
            id: pet._id.toString(),
            species: pet.species,
            breed: pet.breed,
            age: pet.age,
            sex: pet.sex,
            name: pet.name
          };
        }
      } catch (error) {
        console.warn('Could not fetch patient details:', error.message);
      }
    }

    // Search Elasticsearch for suggestions
    const searchQuery = {
      index: 'soap_notes',
      body: {
        size: 5,
        query: {
          bool: {
            must: [
              { term: { field: body.field } },
              {
                multi_match: {
                  query: body.currentText,
                  fields: ['text^2', 'text.keyword'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: [
              // Filter by species if available
              ...(patientData?.species ? [{ term: { species: patientData.species.toLowerCase() } }] : []),
              // Filter by age bucket if available
              ...(patientData?.age ? [{ term: { age_bucket: getAgeBucket(patientData.age) } }] : [])
            ]
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { created_date: { order: 'desc' } }
        ]
      }
    };

    const response = await esClient.search(searchQuery);
    
    // Extract suggestions from response
    const suggestions = response.hits.hits.map(hit => {
      const source = hit._source;
      return {
        text: source.text,
        score: hit._score,
        species: source.species,
        breed: source.breed,
        age_bucket: source.age_bucket
      };
    });

    if (suggestions.length > 0) {
      const bestSuggestion = suggestions[0];
      res.json({
        success: true,
        suggestion: bestSuggestion.text,
        source: 'elasticsearch',
        patient: patientData
      });
    } else {
      // Fallback to rule-based suggestions
      const fallbackSuggestion = generateFallbackSuggestion(body.field, patientData);
      res.json({
        success: true,
        suggestion: fallbackSuggestion,
        source: 'fallback',
        patient: patientData
      });
    }
  } catch (err) {
    console.error('Error in autocomplete handler:', err);
    
    // Handle validation errors
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: err.errors 
      });
    }
    
    // Handle Elasticsearch errors
    if (err.name === 'ConnectionError' || err.name === 'TimeoutError') {
      console.warn('Elasticsearch connection failed, using fallback');
      const fallbackSuggestion = generateFallbackSuggestion(req.body?.field, req.body?.patient);
      return res.json({
        success: true,
        suggestion: fallbackSuggestion,
        source: 'fallback',
        patient: req.body?.patient
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err.message 
    });
  }
}

// Helper function to determine age bucket
function getAgeBucket(age) {
  if (age < 1) return 'puppy';
  if (age > 7) return 'senior';
  return 'adult';
}

// Fallback suggestion generator
function generateFallbackSuggestion(field, patient) {
  const species = patient?.species || 'unknown';
  const breed = patient?.breed || 'unknown';
  const age = patient?.age || 'unknown';
  const sex = patient?.sex || 'unknown';
  
  const templates = {
    subjective: `${species} ${breed}, ${age} age, ${sex} sex: Patient presents with {condition}`,
    objective: `${species} ${breed}, ${age} age, ${sex} sex: {vital signs and physical findings}`,
    assessment: `${species} ${breed}, ${age} age, ${sex} sex: Probable {diagnosis}`,
    plan: `${species} ${breed}, ${age} age, ${sex} sex: {treatment plan}`
  };
  
  return templates[field] || templates.subjective;
} 