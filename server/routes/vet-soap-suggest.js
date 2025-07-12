import express from 'express';
import { dbUtils } from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import axios from 'axios';

const router = express.Router();

// Utility: Generate embedding (stub, replace with real embedding service if available)
function generateEmbedding(text) {
  // For demo: convert text to char codes and normalize
  const arr = Array(512).fill(0);
  for (let i = 0; i < text.length && i < 512; i++) {
    arr[i] = text.charCodeAt(i) / 255;
  }
  return arr;
}

// Utility: Calculate similarity (stub, replace with real vector similarity)
function calculateTextSimilarity(embedding1, text2) {
  if (!embedding1 || !text2) return 0;
  // For demo: use simple word overlap
  const words1 = embedding1.join(' ');
  const words2 = text2.split(/\s+/).join(' ');
  let overlap = 0;
  words2.split(' ').forEach(w => {
    if (words1.includes(w)) overlap++;
  });
  return Math.min(1, overlap / 20);
}

// Utility: Call OpenAI API for suggestions
async function getOpenAISuggestions({ section, input_text, species, age_group, reason, doctor_id }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not set');

  const prompt = `You are a clinical assistant helping a veterinarian write accurate and professional SOAP notes for pets.

Given the following context, generate 3–5 **realistic suggestions** for the "${section}" section. Always write in clinical language appropriate for veterinary medical records.

✍️ Style Guide:
- Use concise and professional tone
- Include clinical terms like "BAR", "T: 102°F", "decreased appetite", etc.
- Avoid generalities like "the pet is sick" or "the pet has a problem"
- Phrase suggestions like a real vet would document them
- Use abbreviations like BID, SID, QD, if needed
- Always relevant to the section: Subjective, Objective, Assessment, or Plan

---

📌 EXAMPLES:

Input text: vomiting, not eating since last night  
Species: Dog  
Age group: Adult  
Visit reason: GI upset  
Section: Subjective  

Suggestions:  
1. Owner reports vomiting since early morning and no food intake.  
2. Client states dog vomited 3 times overnight, no appetite today.  
3. Pet appears lethargic and uninterested in food.  
4. Vomiting onset approximately 10 hours ago, no water intake.  
5. No history of foreign body ingestion per owner.

---

Now complete for:

Input: ${input_text}  
Species: ${species}  
Age group: ${age_group}  
Visit reason: ${reason}  
Section: ${section}
`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful veterinary clinical assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 256,
      temperature: 0.6
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Parse numbered list from OpenAI response
  const text = response.data.choices[0].message.content;
  const suggestions = text.split(/\n+/)
    .map(line => line.replace(/^\d+\.|^- /, '').trim())
    .filter(Boolean)
    .slice(0, 5);
  return suggestions.map(s => ({ text: s, source: 'openai' }));
}

// Utility: Call OpenAI API for paraphrasing
async function getOpenAIParaphrases({ section, input_text, species, age_group, reason, doctor_id }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not set');

  const prompt = `You're a senior veterinarian rewriting SOAP notes for clarity, precision, and medical correctness. Revise the input using proper veterinary terms and formatting.

📝 Guidelines:
- Use clinical tone: clear, concise, professional
- Avoid casual phrases or general descriptions
- Use common vet abbreviations (e.g., BID, SID, MM, CRT)
- Keep medical intent and meaning intact
- Write for medical records, not for clients

Rewrite this "${section}" note:
"${input_text}"

Species: ${species}  
Age group: ${age_group}  
Visit reason: ${reason}  

Give 3 variations, numbered.`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a senior veterinarian with 15+ years of experience writing clinical SOAP notes. You excel at converting casual observations into professional veterinary medical documentation using proper terminology, clear language, and clinical precision.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Parse numbered list from OpenAI response
  const text = response.data.choices[0].message.content;
  const paraphrases = text.split(/\n+/)
    .map(line => line.replace(/^\d+\.|^- /, '').trim())
    .filter(Boolean)
    .slice(0, 4);
  return paraphrases;
}

// Main route
router.post('/vet-soap-suggest', async (req, res) => {
  try {
    const {
      section,
      input_text,
      species,
      age_group,
      reason,
      doctor_id,
      use_prompt = false,
      limit = 5
    } = req.body;

    if (!section || !input_text) {
      return res.status(400).json({ success: false, error: 'section and input_text are required' });
    }

    // 1. Try Elasticsearch/DB vector search
    let suggestions = [];
    if (!use_prompt) {
      // (Stub: Use MongoDB for demo, replace with ES vector search in production)
      const collection = dbUtils.getCollection('medical_records');
      const query = {
        section,
        $or: [
          { subjective: { $exists: true, $ne: '' } },
          { objective: { $exists: true, $ne: '' } },
          { assessment: { $exists: true, $ne: '' } },
          { plan: { $exists: true, $ne: '' } }
        ]
      };
      if (species) query['pet.species'] = { $regex: new RegExp(species, 'i') };
      if (age_group) query['pet.age_group'] = { $regex: new RegExp(age_group, 'i') };
      if (reason) query['visit_reason'] = { $regex: new RegExp(reason, 'i') };
      if (doctor_id) query['veterinarian_id'] = doctor_id;
      const records = await collection.find(query).limit(100).toArray();
      const inputEmbedding = generateEmbedding(input_text);
      const scored = records.map(record => {
        const text = record[section] || '';
        const similarity = calculateTextSimilarity(inputEmbedding, text);
        return { text, similarity };
      });
      suggestions = scored
        .filter(r => r.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(r => ({ text: r.text, similarity: r.similarity, source: 'db' }));
    }

    // 2. If use_prompt or no good ES/DB results, call OpenAI
    if (use_prompt || suggestions.length === 0) {
      const aiSuggestions = await getOpenAISuggestions({ section, input_text, species, age_group, reason, doctor_id });
      suggestions = aiSuggestions;
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error in vet-soap-suggest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Paraphrase route
router.post('/vet-soap-paraphrase', async (req, res) => {
  try {
    const {
      section,
      input_text,
      species,
      age_group,
      reason,
      doctor_id,
      use_prompt = false
    } = req.body;

    if (!section || !input_text) {
      return res.status(400).json({ success: false, error: 'section and input_text are required' });
    }

    if (input_text.trim().split(/\s+/).length < 3) {
      return res.status(400).json({ success: false, error: 'Text must be at least 3 words for paraphrasing' });
    }

    let paraphrases;
    
    if (use_prompt) {
      // Use OpenAI prompts for better paraphrasing
      paraphrases = await getOpenAIParaphrases({ section, input_text, species, age_group, reason, doctor_id });
    } else {
      // Use fallback paraphrasing logic
      paraphrases = generateFallbackParaphrases(section, input_text, species, age_group, reason);
    }

    res.json({ success: true, paraphrases });
  } catch (error) {
    console.error('Error in vet-soap-paraphrase:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback paraphrase generation
function generateFallbackParaphrases(section, inputText, species, ageGroup, reason) {
  const baseText = inputText.trim();
  const speciesText = species || 'patient';
  const ageText = ageGroup || 'adult';
  
  const templates = {
    subjective: [
      `Owner reports ${baseText.toLowerCase()}.`,
      `Client observed ${baseText.toLowerCase()} in the ${speciesText}.`,
      `Patient presents with history of ${baseText.toLowerCase()}.`,
      `${speciesText} ${ageText} showing signs of ${baseText.toLowerCase()}.`
    ],
    objective: [
      `Physical examination reveals ${baseText.toLowerCase()}.`,
      `Clinical findings include ${baseText.toLowerCase()}.`,
      `Assessment shows ${baseText.toLowerCase()}.`,
      `Examination demonstrates ${baseText.toLowerCase()}.`
    ],
    assessment: [
      `Probable diagnosis: ${baseText.toLowerCase()}.`,
      `Assessment consistent with ${baseText.toLowerCase()}.`,
      `Clinical impression: ${baseText.toLowerCase()}.`,
      `Differential diagnosis includes ${baseText.toLowerCase()}.`
    ],
    plan: [
      `Treatment plan: ${baseText.toLowerCase()}.`,
      `Recommendations: ${baseText.toLowerCase()}.`,
      `Management strategy: ${baseText.toLowerCase()}.`,
      `Follow-up plan: ${baseText.toLowerCase()}.`
    ]
  };
  
  return templates[section] || templates.subjective;
}

export default router; 