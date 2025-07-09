import { Client } from '@elastic/elasticsearch';

// Elasticsearch configuration
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ELASTICSEARCH_USERNAME = process.env.ELASTICSEARCH_USERNAME || 'elastic';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';

// Initialize Elasticsearch client
const client = new Client({
  node: ELASTICSEARCH_URL,
  // Remove authentication for development - Elasticsearch is running without security
  // auth: {
  //   username: ELASTICSEARCH_USERNAME,
  //   password: ELASTICSEARCH_PASSWORD,
  // },
  // tls: {
  //   rejectUnauthorized: false // For development only
  // }
});

// Index name for SOAP notes
const SOAP_INDEX = 'soap_notes';

// Initialize Elasticsearch index
export async function initializeElasticsearch() {
  try {
    // Check if index exists
    const indexExists = await client.indices.exists({
      index: SOAP_INDEX
    });

    if (!indexExists) {
      // Create index with mapping
      await client.indices.create({
        index: SOAP_INDEX,
        body: {
          mappings: {
            properties: {
              field: { type: 'keyword' }, // S, O, A, P
              text: { 
                type: 'text', 
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              text_suggest: { 
                type: 'completion',
                analyzer: 'simple',
                preserve_separators: true,
                preserve_position_increments: true,
                max_input_length: 50
              },
              species: { type: 'keyword' },
              breed: { type: 'keyword' },
              age_bucket: { type: 'keyword' }, // puppy, adult, senior
              pet_id: { type: 'keyword' },
              tenant_id: { type: 'keyword' },
              created_date: { type: 'date' },
              updated_date: { type: 'date' }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                standard: {
                  type: 'standard'
                },
                simple: {
                  type: 'simple'
                }
              }
            }
          }
        }
      });

      console.log('✅ Elasticsearch index created:', SOAP_INDEX);
    } else {
      console.log('✅ Elasticsearch index already exists:', SOAP_INDEX);
    }
  } catch (error) {
    console.error('❌ Error initializing Elasticsearch:', error);
    throw error;
  }
}

// Index a SOAP note field
export async function indexSOAPField(soapData) {
  try {
    const { field, text, pet, tenant_id } = soapData;
    
    if (!text || !text.trim()) {
      return; // Don't index empty text
    }

    // Determine age bucket
    const age = pet?.age || 0;
    let ageBucket = 'adult';
    if (age < 1) ageBucket = 'puppy';
    else if (age > 7) ageBucket = 'senior';

    // Prepare document for indexing
    const document = {
      field: field.toLowerCase(), // subjective, objective, assessment, plan
      text: text.trim(),
      text_suggest: {
        input: text.trim().split(/\s+/).slice(0, 5).join(' ') // First 5 words for suggestions
      },
      species: pet?.species || 'unknown',
      breed: pet?.breed || 'unknown',
      age_bucket: ageBucket,
      pet_id: pet?.id || pet?._id?.toString(),
      tenant_id: tenant_id,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    // Index the document
    await client.index({
      index: SOAP_INDEX,
      body: document
    });

    console.log(`✅ Indexed SOAP ${field} field for pet: ${pet?.name || 'unknown'}`);
  } catch (error) {
    console.error('❌ Error indexing SOAP field:', error);
    throw error;
  }
}

// Search for SOAP suggestions
export async function searchSOAPSuggestions(query, field, pet, limit = 5) {
  try {
    const searchQuery = {
      index: SOAP_INDEX,
      body: {
        size: limit,
        query: {
          bool: {
            must: [
              { term: { field: field.toLowerCase() } },
              {
                multi_match: {
                  query: query,
                  fields: ['text^2', 'text.keyword'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: [
              // Filter by species if available
              ...(pet?.species ? [{ term: { species: pet.species.toLowerCase() } }] : []),
              // Filter by age bucket if available
              ...(pet?.age ? [{ term: { age_bucket: getAgeBucket(pet.age) } }] : [])
            ]
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { created_date: { order: 'desc' } }
        ]
      }
    };

    const response = await client.search(searchQuery);
    
    // Extract suggestions from response
    const suggestions = response.hits.hits.map(hit => ({
      text: hit._source.text,
      score: hit._score,
      species: hit._source.species,
      breed: hit._source.breed,
      age_bucket: hit._source.age_bucket
    }));

    return suggestions;
  } catch (error) {
    console.error('❌ Error searching SOAP suggestions:', error);
    return [];
  }
}

// Get completion suggestions (prefix-based)
export async function getCompletionSuggestions(query, field, limit = 5) {
  try {
    const response = await client.search({
      index: SOAP_INDEX,
      body: {
        suggest: {
          text_suggestions: {
            prefix: query,
            completion: {
              field: 'text_suggest',
              size: limit,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: 2
              }
            }
          }
        },
        query: {
          term: { field: field.toLowerCase() }
        }
      }
    });

    const suggestions = response.suggest?.text_suggestions?.[0]?.options || [];
    return suggestions.map(suggestion => ({
      text: suggestion.text,
      score: suggestion.score
    }));
  } catch (error) {
    console.error('❌ Error getting completion suggestions:', error);
    return [];
  }
}

// Bulk index SOAP notes from MongoDB
export async function bulkIndexSOAPNotes(soapNotes) {
  try {
    if (!soapNotes || soapNotes.length === 0) {
      console.log('No SOAP notes to index');
      return;
    }

    const operations = [];
    
    for (const note of soapNotes) {
      // Index each SOAP field separately
      const fields = ['subjective', 'objective', 'assessment', 'plan'];
      
      for (const field of fields) {
        if (note[field] && note[field].trim()) {
          operations.push(
            { index: { _index: SOAP_INDEX } },
            {
              field: field,
              text: note[field].trim(),
              text_suggest: {
                input: note[field].trim().split(/\s+/).slice(0, 5).join(' ')
              },
              species: note.pet?.species || 'unknown',
              breed: note.pet?.breed || 'unknown',
              age_bucket: getAgeBucket(note.pet?.age || 0),
              pet_id: note.pet_id || note.pet?.id,
              tenant_id: note.tenant_id,
              created_date: note.created_date || new Date().toISOString(),
              updated_date: note.updated_date || new Date().toISOString()
            }
          );
        }
      }
    }

    if (operations.length > 0) {
      const response = await client.bulk({ body: operations });
      
      if (response.errors) {
        console.error('❌ Some errors occurred during bulk indexing:', response.items);
      } else {
        console.log(`✅ Successfully bulk indexed ${operations.length / 2} SOAP fields`);
      }
    }
  } catch (error) {
    console.error('❌ Error bulk indexing SOAP notes:', error);
    throw error;
  }
}

// Helper function to determine age bucket
function getAgeBucket(age) {
  if (age < 1) return 'puppy';
  if (age > 7) return 'senior';
  return 'adult';
}

// Get index statistics
export async function getIndexStats() {
  try {
    const stats = await client.indices.stats({ index: SOAP_INDEX });
    return stats.indices[SOAP_INDEX];
  } catch (error) {
    console.error('❌ Error getting index stats:', error);
    return null;
  }
}

// Delete all documents from index
export async function clearIndex() {
  try {
    await client.deleteByQuery({
      index: SOAP_INDEX,
      body: {
        query: { match_all: {} }
      }
    });
    console.log('✅ Cleared SOAP index');
  } catch (error) {
    console.error('❌ Error clearing index:', error);
    throw error;
  }
}

export default {
  initializeElasticsearch,
  indexSOAPField,
  searchSOAPSuggestions,
  getCompletionSuggestions,
  bulkIndexSOAPNotes,
  getIndexStats,
  clearIndex
}; 