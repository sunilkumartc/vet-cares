import React from 'react';
import { useLocation } from 'react-router-dom';

export default function DebugRoutes() {
  const location = useLocation();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Route Debug Information</h1>
      <div className="space-y-4">
        <div>
          <strong>Current Path:</strong> {location.pathname}
        </div>
        <div>
          <strong>Search:</strong> {location.search}
        </div>
        <div>
          <strong>Hash:</strong> {location.hash}
        </div>
        <div>
          <strong>Hostname:</strong> {window.location.hostname}
        </div>
        <div>
          <strong>Full URL:</strong> {window.location.href}
        </div>
        <div>
          <strong>Available Routes:</strong>
          <ul className="list-disc list-inside mt-2">
            <li>/Dashboard</li>
            <li>/StaffLogin</li>
            <li>/StaffDashboard</li>
            <li>/Clients</li>
            <li>/Appointments</li>
            <li>/Pets</li>
            <li>/Billing</li>
            <li>/Settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 