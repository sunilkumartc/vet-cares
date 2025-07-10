# AI-Assisted SOAP Note Autocomplete

## Overview
The VetVault application now includes intelligent autocomplete suggestions for SOAP (Subjective, Objective, Assessment, Plan) note fields. This feature helps veterinarians write more comprehensive and standardized medical records by providing contextual suggestions based on veterinary knowledge and patient information.

## Features

### 🎯 Intelligent Suggestions
- **Context-Aware**: Suggestions adapt based on current text and patient information
- **Field-Specific**: Different suggestion patterns for each SOAP field
- **Patient-Aware**: Incorporates patient signalment (species, breed, age, sex)
- **Real-Time**: Debounced API calls for smooth user experience

### ⌨️ User Interface
- **Inline Suggestions**: Ghost text appears below the textarea
- **Tab to Accept**: Press Tab to insert the suggestion at cursor position
- **Escape to Dismiss**: Press Escape to clear suggestions
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Graceful error display

### 🏥 Veterinary Knowledge Base
The system includes comprehensive veterinary terminology and patterns:

#### Subjective Field
- **Patterns**: "Owner reports {symptom} for {duration}"
- **Symptoms**: head shaking, ear scratching, lethargy, vomiting, etc.
- **Timeframes**: "for the past 3 days", "for 1 week", etc.

#### Objective Field
- **Findings**: ear canal erythema, aural discharge, pyoderma, etc.
- **Vitals**: Temperature, heart rate, respiratory rate, weight, etc.
- **Patterns**: "{finding} present", "Temperature: {temp}°F"

#### Assessment Field
- **Diagnoses**: otitis externa, pyoderma, dermatitis, etc.
- **Patterns**: "Probable {diagnosis}", "Differential diagnoses: {differentials}"
- **Differentials**: bacterial vs yeast, allergic vs parasitic, etc.

#### Plan Field
- **Tests**: Cytology, Culture and sensitivity, Blood work, etc.
- **Medications**: OticClean BID, Enrofloxacin drops, Prednisolone, etc.
- **Patterns**: "{test} today", "Start {medication} {frequency} for {duration}"

## Technical Implementation

### Frontend Components

#### AutoCompleteTextarea
```jsx
<AutoCompleteTextarea
  field="subjective"
  patient={petData}
  value={formData.subjective}
  onChange={handleChange}
  placeholder="Enter chief complaint..."
  rows={12}
/>
```

#### useAutoComplete Hook
```jsx
const { 
  suggestion, 
  isLoading, 
  error, 
  fetchSuggestion, 
  clearSuggestion 
} = useAutoComplete({ field, patient });
```

### Backend API

#### Autocomplete Endpoint
```
POST /api/soap/autocomplete
```

#### Request Body
```json
{
  "field": "subjective|objective|assessment|plan",
  "currentText": "User's current text",
  "patient": {
    "id": "pet_id",
    "species": "Dog",
    "breed": "Labrador",
    "age": "3 years",
    "sex": "Male"
  }
}
```

#### Response
```json
{
  "success": true,
  "suggestion": "Owner reports head shaking and scratching for 3 days",
  "source": "elasticsearch|fallback",
  "patient": { ... }
}
```

#### Indexing Endpoints
```
POST /api/soap/index          # Index single SOAP note
POST /api/soap/bulk-index     # Bulk index all SOAP notes
GET  /api/soap/stats          # Get index statistics
```

### Elasticsearch Integration

#### Index Mapping
```json
{
  "mappings": {
    "properties": {
      "field": { "type": "keyword" },           // S, O, A, P
      "text": { 
        "type": "text", 
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "text_suggest": { "type": "completion" }, // for prefix suggester
      "species": { "type": "keyword" },
      "breed": { "type": "keyword" },
      "age_bucket": { "type": "keyword" },      // puppy, adult, senior
      "pet_id": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "created_date": { "type": "date" },
      "updated_date": { "type": "date" }
    }
  }
}
```

#### Search Strategy
1. **Elasticsearch First**: Search historical SOAP notes with patient context
2. **Fallback**: Use rule-based suggestions if no Elasticsearch results
3. **Context Filtering**: Filter by species, breed, and age bucket
4. **Fuzzy Matching**: Handle typos and variations in text

### Knowledge Base Structure
The AI suggestion engine uses a structured knowledge base with:
- **Patterns**: Template strings for generating suggestions
- **Vocabulary**: Field-specific terminology and phrases
- **Context Rules**: Logic for adapting suggestions based on current text
- **Patient Integration**: Incorporation of patient-specific information

## Usage Examples

### Scenario: Otitis Externa Case
**Patient**: 3-year-old Labrador "Buddy"

#### Subjective Field
- **User types**: "Owner reports"
- **Suggestion**: "Owner reports head shaking and scratching for 3 days"
- **Action**: Press Tab to accept

#### Objective Field
- **User types**: "Ear canal"
- **Suggestion**: "erythematous; aural discharge present; temp 102.1°F"
- **Action**: Press Tab to accept

#### Assessment Field
- **User types**: "Probable"
- **Suggestion**: "otitis externa – bacterial, r/o yeast"
- **Action**: Press Tab to accept

#### Plan Field
- **User types**: "Cytology"
- **Suggestion**: "start OticClean BID + Enrofloxacin drops 10d; recheck in 14d"
- **Action**: Press Tab to accept

## Setup and Configuration

### Prerequisites
- Backend server running on port 3001
- MongoDB connection established
- Test data available (run vaccination test setup)

### Testing
```bash
# Set up Elasticsearch and sample data
npm run setup:elasticsearch

# Test the autocomplete API
npm run test:soap-autocomplete

# Set up vaccination test data (if needed)
npm run setup:test-vaccination
```

### Development
1. **Start Elasticsearch**: Ensure Elasticsearch is running on localhost:9200
2. **Start Backend**: Ensure server.js is running
3. **Start Frontend**: Run `npm run dev`
4. **Navigate**: Go to Medical Records → Create/Edit Record
5. **Test**: Type in SOAP fields to see suggestions

### Elasticsearch Setup
```bash
# Install Elasticsearch (macOS with Homebrew)
brew install elasticsearch
brew services start elasticsearch

# Or use Docker
docker run -d --name elasticsearch -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Initialize index and sample data
npm run setup:elasticsearch
```

## Customization

### Adding New Patterns
Edit the `knowledgeBase` object in `server.js`:

```javascript
const knowledgeBase = {
  subjective: {
    patterns: [
      "Owner reports {symptom} for {duration}",
      // Add new patterns here
    ],
    symptoms: [
      "head shaking", "ear scratching",
      // Add new symptoms here
    ]
  }
  // ... other fields
};
```

### Extending Vocabulary
Add new terms to the appropriate field arrays:
- `symptoms` for subjective field
- `findings` for objective field
- `diagnoses` for assessment field
- `medications` for plan field

### Context Rules
Modify the suggestion logic in `generateSOAPSuggestion()`:
```javascript
if (lastWord.includes('ear') || lastWord.includes('scratch')) {
  suggestion = "head shaking and scratching for 3 days";
}
```

## Performance Considerations

### Debouncing
- API calls are debounced by 500ms to prevent excessive requests
- AbortController cancels pending requests when new ones are made

### Caching
- Suggestions are not cached to ensure fresh, contextual responses
- Consider implementing caching for frequently used patterns

### Rate Limiting
- No built-in rate limiting (consider adding for production)
- Monitor API usage and implement limits as needed

## Future Enhancements

### Advanced Features
- **Machine Learning**: Train on actual veterinary records
- **Voice Input**: Speech-to-text with autocomplete
- **Template Library**: Pre-built SOAP templates
- **Smart Suggestions**: Learn from user preferences

### Integration
- **Lab Results**: Incorporate recent lab values
- **Medication History**: Suggest based on previous treatments
- **Breed-Specific**: Tailor suggestions to breed predispositions
- **Age-Appropriate**: Adjust suggestions based on patient age

### User Experience
- **Keyboard Shortcuts**: Additional hotkeys for common actions
- **Suggestion History**: Remember frequently used phrases
- **Custom Templates**: User-defined suggestion patterns
- **Collaborative Learning**: Share patterns across clinics

## Troubleshooting

### Common Issues
1. **No Suggestions**: Check API endpoint is running
2. **Wrong Suggestions**: Verify patient data is correct
3. **Slow Response**: Check network and server performance
4. **API Errors**: Review server logs for error details

### Debugging
- Check browser console for frontend errors
- Review server logs for backend errors
- Test API endpoint directly with curl or Postman
- Verify MongoDB connection and data

### Support
- Check the test script for API validation
- Review knowledge base structure
- Verify patient data format
- Test with different SOAP fields 