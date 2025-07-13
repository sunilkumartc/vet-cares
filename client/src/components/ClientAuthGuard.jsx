import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TenantManager } from '@/lib/tenant';
import ClientSessionManager from '@/lib/clientSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

export default function ClientAuthGuard({ children, requireAuth = true }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantValid, setTenantValid] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const validateAccess = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if client is authenticated
        const session = ClientSessionManager.getCurrentSession();
        if (!session || !session.authenticated) {
          if (requireAuth) {
            setError('Please log in to access this page.');
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          } else {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }

        // Allow access even if profile is not completed
        // The profile update modal will be shown by the component itself

        // Get current tenant
        const currentTenant = await TenantManager.getCurrentTenant();
        if (!currentTenant) {
          setError('Unable to determine clinic. Please try again.');
          setIsLoading(false);
          return;
        }

        // Validate that client belongs to current tenant
        const hasTenantAccess = ClientSessionManager.validateTenantAccess(currentTenant._id);
        if (!hasTenantAccess) {
          setError('Access denied. Your session is not valid for this clinic.');
          ClientSessionManager.clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check if session is expired
        if (ClientSessionManager.isSessionExpired()) {
          setError('Your session has expired. Please log in again.');
          ClientSessionManager.clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Refresh session to extend login time
        ClientSessionManager.refreshSession();

        setIsAuthenticated(true);
        setTenantValid(true);
      } catch (error) {
        console.error('ClientAuthGuard error:', error);
        setError('An error occurred while validating your access.');
      } finally {
        setIsLoading(false);
      }
    };

    validateAccess();
  }, [requireAuth]);

  const handleLogin = () => {
    navigate(createPageUrl('Home'));
  };

  const handleLogout = () => {
    ClientSessionManager.clearSession();
    navigate(createPageUrl('Home'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Validating your access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleLogin} className="w-full">
                Go to Login
              </Button>
              {ClientSessionManager.isAuthenticated() && (
                <Button variant="outline" onClick={handleLogout} className="w-full">
                  Logout
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">Please log in to access this page.</p>
            <Button onClick={handleLogin} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if all validations pass
  return children;
}