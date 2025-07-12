const { MongoClient } = require('mongodb');

async function testSoapSuggestions() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('vet-cares');
    
    // Test the SOAP suggestions API
    console.log('\n🧪 Testing SOAP Suggestions API...');
    
    const testData = {
      section: 'subjective',
      input_text: 'Patient presents with lethargy and decreased appetite',
      species: 'Canine',
      age_group: 'Adult',
      reason: 'general examination',
      doctor_id: 'Dr. Smith',
      use_prompt: false
    };
    
    const response = await fetch('http://localhost:3000/api/vet-soap-suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'test-clinic' // Add tenant ID for testing
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SOAP Suggestions API Response:');
      console.log('Success:', data.success);
      console.log('Suggestions count:', data.suggestions?.length || 0);
      if (data.suggestions?.length > 0) {
        console.log('First suggestion:', data.suggestions[0]);
      }
    } else {
      console.log('❌ SOAP Suggestions API failed:', response.status, response.statusText);
    }
    
    // Test paraphrase API
    console.log('\n🧪 Testing SOAP Paraphrase API...');
    
    const paraphraseData = {
      section: 'subjective',
      input_text: 'Patient presents with lethargy and decreased appetite for the past 2 days. Owner reports the dog has been sleeping more than usual and not eating his regular food.',
      species: 'Canine',
      age_group: 'Adult',
      reason: 'general examination',
      doctor_id: 'Dr. Smith',
      use_prompt: true
    };
    
    const paraphraseResponse = await fetch('http://localhost:3000/api/vet-soap-paraphrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'test-clinic'
      },
      body: JSON.stringify(paraphraseData)
    });
    
    if (paraphraseResponse.ok) {
      const paraphraseResult = await paraphraseResponse.json();
      console.log('✅ SOAP Paraphrase API Response:');
      console.log('Success:', paraphraseResult.success);
      console.log('Paraphrases count:', paraphraseResult.paraphrases?.length || 0);
      if (paraphraseResult.paraphrases?.length > 0) {
        console.log('First paraphrase:', paraphraseResult.paraphrases[0]);
      }
    } else {
      console.log('❌ SOAP Paraphrase API failed:', paraphraseResponse.status, paraphraseResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testSoapSuggestions(); 