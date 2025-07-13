import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Heart, Mail, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { TenantClient } from '@/api/tenant-entities';
import { User } from '@/api/tenant-entities';
import { createPageUrl } from '@/utils';
import { TenantManager } from '@/lib/tenant';
import ClientSessionManager from '@/lib/clientSession';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const currentTenant = TenantManager.getCurrentTenant();
      setTenant(currentTenant);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    console.log('Form submission - isLogin:', isLogin);
    console.log('Form data:', formData);
    console.log('Tenant config:', tenant?.registration_settings);
    
    // Ensure tenant is loaded
    if (!tenant) {
      setError('Loading tenant configuration... Please try again.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        // For login, check if user exists in TenantClient records
        if (!formData.email || !formData.password) {
          setError('Please enter both email and password.');
          setLoading(false);
          return;
        }

        // Get current tenant first
        const currentTenant = await TenantManager.getCurrentTenant();
        if (!currentTenant) {
          setError('Unable to determine clinic. Please try again.');
          setLoading(false);
          return;
        }

        // Get all clients for current tenant and find the matching one
        const clients = await TenantClient.list();
        const client = clients.find(c => 
          c.email?.toLowerCase() === formData.email.toLowerCase() && 
          c.password === formData.password &&
          c.tenant_id === currentTenant._id // Ensure client belongs to current tenant
        );

        if (client) {
          // Create session using ClientSessionManager
          ClientSessionManager.createSession(client, currentTenant._id);
          onClose();
          
          // Redirect to client dashboard
          window.location.href = createPageUrl('MyPets');
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // For signup, create a new client account
        const requiredFields = ['email', 'password'];
        if (tenant?.registration_settings?.require_full_name) {
          requiredFields.push('fullName');
        }
        
        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
          console.log('Missing fields:', missingFields);
          console.log('Form data:', formData);
          console.log('Tenant config:', tenant?.registration_settings);
          setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
          setLoading(false);
          return;
        }

        // Get current tenant first
        const currentTenant = await TenantManager.getCurrentTenant();
        if (!currentTenant) {
          setError('Unable to determine clinic. Please try again.');
          setLoading(false);
          return;
        }

        // Check if email already exists within current tenant
        const clients = await TenantClient.list();
        const existingClient = clients.find(c => 
          c.email?.toLowerCase() === formData.email.toLowerCase() &&
          c.tenant_id === currentTenant._id
        );
        
        if (existingClient) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        // Create new client record
        const nameParts = formData.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const clientData = {
          first_name: firstName,
          last_name: lastName,
          email: formData.email.toLowerCase(),
          password: formData.password,
          phone: '',
          address: '',
          tenant_id: currentTenant._id // Explicitly set tenant_id
        };

        const newClient = await TenantClient.create(clientData);

        // Create session using ClientSessionManager
        ClientSessionManager.createSession(newClient, currentTenant._id);
        onClose();
        
        // Redirect to client dashboard
        window.location.href = createPageUrl('MyPets');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(isLogin ? 'Login failed. Please try again.' : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-2 top-2"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isLogin ? 
              (tenant?.login_customization?.login_title || 'Welcome Back!') : 
              (tenant?.login_customization?.signup_title || `Join ${tenant?.clinic_name || tenant?.name || 'Our Clinic'} Family`)
            }
          </CardTitle>
          <p className="text-gray-600">
            {isLogin ? 
              (tenant?.login_customization?.login_subtitle || 'Sign in to book appointments') : 
              (tenant?.login_customization?.signup_subtitle || 'Create account to get started')
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && tenant?.registration_settings?.require_full_name && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10"
                    required={true}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            {tenant?.registration_settings?.terms_of_service || 'By continuing, you agree to our Terms of Service and Privacy Policy'}
            {tenant?.registration_settings?.terms_url && (
              <div className="mt-1">
                <a href={tenant.registration_settings.terms_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
                {tenant?.registration_settings?.privacy_policy_url && (
                  <>
                    {' • '}
                    <a href={tenant.registration_settings.privacy_policy_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}