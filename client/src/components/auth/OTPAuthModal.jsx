import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, ArrowLeft, CheckCircle, Clock, User, Mail, MapPin } from 'lucide-react';
import { sendOTP, verifyOTP, checkPhoneExists, updateCustomerProfile } from '@/api/otpService';
import ClientSessionManager from '@/lib/clientSession';
import { createPageUrl } from '@/utils';

export default function OTPAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone', 'otp', 'profile'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [otp, setOtp] = useState('');
  const [myopRefId, setMyopRefId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: ''
  });
  const [isExistingUser, setIsExistingUser] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if phone exists
      const phoneCheck = await checkPhoneExists(phoneNumber);
      setIsExistingUser(phoneCheck.exists);

      // Send OTP
      const result = await sendOTP(phoneNumber, countryCode);
      setMyopRefId(result.myopRefId);
      setStep('otp');
      setResendTimer(60); // 60 seconds cooldown
      setSuccess('OTP sent successfully!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyOTP(phoneNumber, otp, myopRefId);
      
      // Create session
      ClientSessionManager.createSession(result.session, result.session.tenant_id);
      
      if (result.client.profile_completed) {
        // Profile already completed, redirect to dashboard
        onSuccess && onSuccess(result.session);
        onClose();
        window.location.href = createPageUrl('MyPets');
      } else {
        // Profile not completed, redirect to dashboard but show profile update popup
        onSuccess && onSuccess(result.session);
        onClose();
        
        // Show profile update popup after a short delay
        setTimeout(() => {
          window.location.href = createPageUrl('MyPets');
          // The profile update popup will be handled by the MyPets component
        }, 100);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateCustomerProfile(profileData);
      
      // Update session with profile data
      const session = ClientSessionManager.getCurrentSession();
      const updatedSession = {
        ...session,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        full_name: `${profileData.first_name} ${profileData.last_name}`.trim(),
        email: profileData.email,
        profile_completed: true
      };
      ClientSessionManager.updateSession(updatedSession);
      
      onSuccess && onSuccess(updatedSession);
      onClose();
      window.location.href = createPageUrl('MyPets');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await sendOTP(phoneNumber, countryCode);
      setMyopRefId(result.myopRefId);
      setResendTimer(60);
      setSuccess('OTP resent successfully!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
      setError('');
      setSuccess('');
    } else if (step === 'profile') {
      setStep('otp');
      setError('');
    }
  };

  if (!isOpen) return null;

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
            ✕
          </Button>
          
          {step !== 'phone' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="absolute left-2 top-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-900">
            {step === 'phone' && 'Quick Login'}
            {step === 'otp' && 'Enter OTP'}
            {step === 'profile' && 'Complete Profile'}
          </CardTitle>
          
          <p className="text-gray-600">
            {step === 'phone' && 'Enter your phone number to continue'}
            {step === 'otp' && `We've sent a 4-digit code to ${phoneNumber}`}
            {step === 'profile' && 'Please complete your profile to continue'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Phone Number Step */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="91">+91</SelectItem>
                      <SelectItem value="1">+1</SelectItem>
                      <SelectItem value="44">+44</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    className="flex-1"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 4-digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={4}
                  required
                />
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Didn't receive the code?</span>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || loading}
                  className="p-0 h-auto"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </Button>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading || otp.length !== 4}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>
          )}

          {/* Profile Step */}
          {step === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="first_name"
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="First name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="address"
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Your address"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 