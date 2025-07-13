import React from 'react';
import ClientSessionManager from '@/lib/clientSession';

export default function SessionDebug() {
  const session = ClientSessionManager.getCurrentSession();
  const displayName = ClientSessionManager.getDisplayName();
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Session Debug</h4>
      <div className="space-y-1">
        <div><strong>Display Name:</strong> {displayName}</div>
        <div><strong>Session:</strong> {session ? 'Yes' : 'No'}</div>
        {session && (
          <>
            <div><strong>ID:</strong> {session.id || 'undefined'}</div>
            <div><strong>Client ID:</strong> {session.client_id || 'undefined'}</div>
            <div><strong>First Name:</strong> {session.first_name || 'undefined'}</div>
            <div><strong>Last Name:</strong> {session.last_name || 'undefined'}</div>
            <div><strong>Full Name:</strong> {session.full_name || 'undefined'}</div>
            <div><strong>Email:</strong> {session.email || 'undefined'}</div>
            <div><strong>Tenant ID:</strong> {session.tenant_id || 'undefined'}</div>
            <div><strong>Authenticated:</strong> {session.authenticated ? 'Yes' : 'No'}</div>
          </>
        )}
      </div>
    </div>
  );
} 