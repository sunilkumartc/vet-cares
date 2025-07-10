import type { Request, Response } from 'express';
import { z } from 'zod';
import { esClient } from '../../../lib/esClient';
import { SOAPField } from '../../../types/soap';

const schema = z.object({
  field: z.enum(['subjective', 'objective', 'assessment', 'plan']),
  currentText: z.string().min(1),
  patient: z.object({
    id: z.string(),
    species: z.string().optional(),
    breed: z.string().optional(),
    age: z.number().optional(),
    sex: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
});

export async function autocompleteHandler(req: Request, res: Response) {
  try {
    const body = schema.parse(req.body);
    
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
              ...(body.patient?.species ? [{ term: { species: body.patient.species.toLowerCase() } }] : []),
              // Filter by age bucket if available
              ...(body.patient?.age ? [{ term: { age_bucket: getAgeBucket(body.patient.age) } }] : [])
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
      const source = hit._source as any;
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
        patient: body.patient
      });
    } else {
      // Fallback to rule-based suggestions
      const fallbackSuggestion = generateFallbackSuggestion(body.field, body.patient);
      res.json({
        success: true,
        suggestion: fallbackSuggestion,
        source: 'fallback',
        patient: body.patient
      });
    }
  } catch (err: any) {
    console.error('Error in autocomplete handler:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// Helper function to determine age bucket
function getAgeBucket(age: number): string {
  if (age < 1) return 'puppy';
  if (age > 7) return 'senior';
  return 'adult';
}

// Fallback suggestion generator
function generateFallbackSuggestion(field: string, patient?: any): string {
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
  
  return templates[field as keyof typeof templates] || templates.subjective;
} 