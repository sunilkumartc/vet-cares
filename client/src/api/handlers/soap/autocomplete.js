import { z } from 'zod';

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
    
    // Make API call to server-side autocomplete endpoint
    const response = await fetch('/api/soap/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Error in autocomplete handler:', err);
    
    // Handle validation errors
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: err.errors 
      });
    }
    
    // Handle server errors
    if (err.message.includes('Server responded')) {
      console.warn('Server autocomplete failed, using fallback');
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