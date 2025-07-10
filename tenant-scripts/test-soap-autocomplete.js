#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'vet-cares';

async function testSOAPAutocomplete() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🧪 Testing SOAP Autocomplete API...');
    
    // Get test pet
    const petsCollection = db.collection('pets');
    const testPet = await petsCollection.findOne({ name: 'Buddy' });
    
    if (!testPet) {
      console.log('❌ Test pet "Buddy" not found. Run setup:test-vaccination first.');
      return;
    }
    
    console.log('✅ Found test pet:', testPet.name, `(${testPet.species} ${testPet.breed})`);
    
    // Test cases for each SOAP field
    const testCases = [
      {
        field: 'subjective',
        currentText: 'Owner reports',
        expectedKeywords: ['head shaking', 'ear scratching', 'lethargy']
      },
      {
        field: 'objective',
        currentText: 'Ear canal',
        expectedKeywords: ['erythematous', 'aural discharge', 'temperature']
      },
      {
        field: 'assessment',
        currentText: 'Probable',
        expectedKeywords: ['otitis externa', 'bacterial', 'yeast']
      },
      {
        field: 'plan',
        currentText: 'Cytology',
        expectedKeywords: ['OticClean', 'Enrofloxacin', 'recheck']
      }
    ];
    
    // Test each field
    for (const testCase of testCases) {
      console.log(`\n📝 Testing ${testCase.field} field...`);
      
      const payload = {
        field: testCase.field,
        currentText: testCase.currentText,
        patient: {
          id: testPet._id.toString(),
          species: testPet.species,
          breed: testPet.breed,
          age: testPet.age,
          sex: testPet.sex
        }
      };
      
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      // Call the API
      const response = await fetch('http://localhost:3001/api/soap/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
          if (response.ok) {
      console.log('✅ API call successful!');
      console.log('Suggestion:', result.suggestion);
      console.log('Source:', result.source);
      
      // Check if suggestion contains expected keywords
      const suggestion = result.suggestion.toLowerCase();
      const hasExpectedKeywords = testCase.expectedKeywords.some(keyword => 
        suggestion.includes(keyword.toLowerCase())
      );
      
      if (hasExpectedKeywords) {
        console.log('✅ Suggestion contains relevant veterinary terms');
      } else {
        console.log('⚠️  Suggestion may not contain expected keywords');
      }
      
      // Check if using Elasticsearch
      if (result.source === 'elasticsearch') {
        console.log('✅ Using Elasticsearch suggestions');
      } else {
        console.log('⚠️  Using fallback suggestions');
      }
    } else {
      console.log('❌ API call failed:');
      console.log('Status:', response.status);
      console.log('Error:', result.error);
    }
    }
    
    // Test with empty text
    console.log('\n📝 Testing with minimal text...');
    const minimalPayload = {
      field: 'subjective',
      currentText: 'ab',
      patient: { id: testPet._id.toString() }
    };
    
    const minimalResponse = await fetch('http://localhost:3001/api/soap/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(minimalPayload)
    });
    
    const minimalResult = await minimalResponse.json();
    
    if (minimalResponse.ok && !minimalResult.suggestion) {
      console.log('✅ Correctly returns empty suggestion for short text');
    } else {
      console.log('⚠️  May be returning suggestions for short text');
    }
    
  } catch (error) {
    console.error('❌ Error testing SOAP autocomplete:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSOAPAutocomplete().then(() => {
    console.log('\n✅ SOAP autocomplete test completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
} 