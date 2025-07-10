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
async function initializeElasticsearch() {
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
async function indexSOAPField(soapData) {
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
async function searchSOAPSuggestions(query, field, pet, limit = 5) {
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
async function getCompletionSuggestions(query, field, limit = 5) {
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
    return suggestions.map(option => ({
      text: option.text,
      score: option.score
    }));
  } catch (error) {
    console.error('❌ Error getting completion suggestions:', error);
    return [];
  }
}

// Bulk index multiple SOAP notes
async function bulkIndexSOAPNotes(soapNotes) {
  try {
    const operations = [];
    
    for (const note of soapNotes) {
      const { field, text, pet, tenant_id } = note;
      
      if (!text || !text.trim()) continue;

      const age = pet?.age || 0;
      let ageBucket = 'adult';
      if (age < 1) ageBucket = 'puppy';
      else if (age > 7) ageBucket = 'senior';

      const document = {
        field: field.toLowerCase(),
        text: text.trim(),
        text_suggest: {
          input: text.trim().split(/\s+/).slice(0, 5).join(' ')
        },
        species: pet?.species || 'unknown',
        breed: pet?.breed || 'unknown',
        age_bucket: ageBucket,
        pet_id: pet?.id || pet?._id?.toString(),
        tenant_id: tenant_id,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      operations.push({ index: { _index: SOAP_INDEX } });
      operations.push(document);
    }

    if (operations.length > 0) {
      await client.bulk({ body: operations });
      console.log(`✅ Bulk indexed ${operations.length / 2} SOAP fields`);
    }
  } catch (error) {
    console.error('❌ Error bulk indexing SOAP notes:', error);
    throw error;
  }
}

// Helper function to get age bucket
function getAgeBucket(age) {
  if (age < 1) return 'puppy';
  if (age > 7) return 'senior';
  return 'adult';
}

// Get index statistics
async function getIndexStats() {
  try {
    const stats = await client.indices.stats({ index: SOAP_INDEX });
    return {
      total_docs: stats.indices[SOAP_INDEX]?.total?.docs?.count || 0,
      store_size: stats.indices[SOAP_INDEX]?.total?.store?.size_in_bytes || 0,
      index_size: stats.indices[SOAP_INDEX]?.total?.indexing?.index_total || 0
    };
  } catch (error) {
    console.error('❌ Error getting index stats:', error);
    return {
      error: 'Elasticsearch index not found or not accessible'
    };
  }
}

// Clear index (for testing/reset)
async function clearIndex() {
  try {
    await client.indices.delete({ index: SOAP_INDEX });
    console.log('✅ Elasticsearch index cleared');
  } catch (error) {
    console.error('❌ Error clearing index:', error);
    throw error;
  }
}

export {
  client,
  SOAP_INDEX,
  initializeElasticsearch,
  indexSOAPField,
  searchSOAPSuggestions,
  getCompletionSuggestions,
  bulkIndexSOAPNotes,
  getIndexStats,
  clearIndex
}; 