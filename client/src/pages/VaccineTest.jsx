import React, { useState, useEffect } from 'react';
import { TenantVaccine } from '@/api/tenant-entities';

export default function VaccineTest() {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('VaccineTest - Loading vaccines...');
      const result = await TenantVaccine.filter({}, 'name');
      console.log('VaccineTest - Raw result:', result);
      setVaccines(result || []);
    } catch (err) {
      console.error('VaccineTest - Error loading vaccines:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Vaccine Test Page</h1>
      
      <button 
        onClick={loadVaccines}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Reload Vaccines
      </button>

      {loading && <p>Loading vaccines...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Vaccines ({vaccines.length})</h2>
        {vaccines.length === 0 ? (
          <p>No vaccines found</p>
        ) : (
          <div className="space-y-2">
            {vaccines.map((vaccine, index) => (
              <div key={vaccine._id || index} className="border p-3 rounded">
                <h3 className="font-semibold">{vaccine.name}</h3>
                <p>Type: {vaccine.vaccine_type || vaccine.category || 'Unknown'}</p>
                <p>Frequency: {vaccine.frequency_months || vaccine.duration_months || 'Unknown'} months</p>
                <p>Species: {vaccine.species ? vaccine.species.join(', ') : 'Not specified'}</p>
                <p>Description: {vaccine.description || 'No description'}</p>
                <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto">
                  {JSON.stringify(vaccine, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 