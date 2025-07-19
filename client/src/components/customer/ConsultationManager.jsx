import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { CalendarIcon, Video, Clock, User, Phone, AlertCircle, CheckCircle, XCircle, Mail, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import ClientSessionManager from '../../lib/clientSession';
import { cn } from '../../lib/utils';

const ConsultationManager = ({ clientId, tenantId }) => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [callFrame, setCallFrame] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');

  // Load Daily.co script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => {
      console.log('Daily.co script loaded for client');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://unpkg.com/@daily-co/daily-js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Load consultations on component mount
  useEffect(() => {
    if (clientId && tenantId) {
      loadConsultations();
    }
  }, [clientId, tenantId]);

  // Cleanup function for call frame
  const cleanupCallFrame = () => {
    if (callFrame) {
      try {
        callFrame.destroy();
      } catch (error) {
        console.log('Call frame already destroyed or not initialized');
      }
      setCallFrame(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCallFrame();
    };
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get client's pets first
      const petsResponse = await fetch(`/api/entities/pets?tenant_id=${tenantId}&client_id=${clientId}`);
      if (!petsResponse.ok) {
        throw new Error('Failed to load pets');
      }
      const petsData = await petsResponse.json();
      const petIds = petsData.data.map(pet => pet._id);

      // Get consultations for all pets
      const consultationsResponse = await fetch('/api/daily/client-consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          clientId,
          petIds
        }),
      });

      if (!consultationsResponse.ok) {
        throw new Error('Failed to load consultations');
      }

      const data = await consultationsResponse.json();
      if (data.success) {
        setConsultations(data.consultations);
      } else {
        throw new Error(data.error || 'Failed to load consultations');
      }
    } catch (err) {
      console.error('Error loading consultations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinConsultation = async (consultation) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily/get-meeting-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: consultation._id,
          userId: clientId,
          userType: 'patient'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log('Consultation token received:', data);
        setSelectedConsultation(consultation);
        setShowJoinModal(false);
        await joinVideoCall(data.roomUrl, data.token, data.userName);
      } else {
        throw new Error(data.error || 'Failed to get consultation token');
      }
    } catch (err) {
      console.error('Error joining consultation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinVideoCall = async (roomUrl, token, userName) => {
    try {
      if (!window.DailyIframe) {
        throw new Error('Daily.co SDK not loaded');
      }

      // Clean up any existing call frame first
      cleanupCallFrame();

      // Open video modal first
      setShowVideoModal(true);

      // Wait for modal to open and container to be available
      setTimeout(async () => {
        const container = document.getElementById('client-video-container');
        if (!container) {
          throw new Error('Video container not found');
        }

        // Clear the container
        container.innerHTML = '';

        // Create call frame
        const dailyCallFrame = window.DailyIframe.createFrame(container, {
          iframeStyle: { width: '100%', height: '100%', border: 'none' },
        });

        setCallFrame(dailyCallFrame);

        // Join the call with token
        await dailyCallFrame.join({
          url: roomUrl,
          token: token
        });

        setIsInCall(true);
        setCallStatus('connected');

        // Set up event listeners
        dailyCallFrame.on('joined-meeting', () => {
          console.log('Joined consultation successfully');
          setCallStatus('joined');
        });

        dailyCallFrame.on('left-meeting', () => {
          console.log('Left consultation');
          setIsInCall(false);
          setCallStatus('idle');
          setSelectedConsultation(null);
          setShowVideoModal(false);
          cleanupCallFrame();
        });

        dailyCallFrame.on('error', (error) => {
          console.error('Daily.co error:', error);
          setError(`Video call error: ${error.errorMsg}`);
          setCallStatus('error');
        });

      }, 100);

    } catch (err) {
      console.error('Error joining video call:', err);
      setError(`Failed to join video call: ${err.message}`);
      setCallStatus('error');
      setShowVideoModal(false);
      cleanupCallFrame();
    }
  };

  const leaveCall = () => {
    if (callFrame) {
      try {
        callFrame.leave();
      } catch (error) {
        console.log('Error leaving call:', error);
      }
    }
    setIsInCall(false);
    setCallStatus('idle');
    setSelectedConsultation(null);
    setShowVideoModal(false);
    cleanupCallFrame();
  };

  const resendEmail = async (consultation) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily/resend-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: consultation._id,
          userType: 'patient',
          email: consultation.patientEmail || consultation.clientEmail
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert('Consultation email sent successfully!');
      } else {
        throw new Error(data.error || 'Failed to resend email');
      }
    } catch (err) {
      console.error('Error resending email:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'in-progress': { color: 'bg-green-100 text-green-800', icon: Video },
      'completed': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig['scheduled'];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatDateTime = (date) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  const isConsultationJoinable = (consultation) => {
    const now = new Date();
    const startTime = new Date(consultation.scheduledTime);
    const endTime = new Date(consultation.endTime);
    
    // Can join 15 minutes before start time until end time
    const canJoinFrom = new Date(startTime.getTime() - (15 * 60 * 1000));
    return now >= canJoinFrom && now <= endTime && consultation.status === 'scheduled';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            My Online Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading your consultations...</div>
            ) : consultations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No consultations scheduled yet.</p>
                <p className="text-sm">Your veterinarian will schedule consultations here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {consultations.map((consultation) => (
                  <Card key={consultation._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{consultation.patientName}</span>
                          {getStatusBadge(consultation.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>Scheduled: {formatDateTime(consultation.scheduledTime)}</div>
                          <div>Duration: {consultation.duration} minutes</div>
                          <div>Doctor: {consultation.staffName || 'Dr. Staff'}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isConsultationJoinable(consultation) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedConsultation(consultation);
                              setShowJoinModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Video className="w-3 h-3" />
                            Join
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendEmail(consultation)}
                          className="flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          Resend
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Join Consultation Confirmation Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Join Consultation</DialogTitle>
            <DialogDescription>
              Are you ready to join your consultation with {selectedConsultation?.staffName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Before joining:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure you have a stable internet connection</li>
                <li>• Test your camera and microphone</li>
                <li>• Have your pet ready for the consultation</li>
                <li>• Find a quiet, well-lit area</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleJoinConsultation(selectedConsultation)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Joining...' : 'Join Consultation'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowJoinModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[100vw] md:max-w-[100vw] lg:max-w-[100vw] h-[100vh] max-h-[100vh] p-0 border-0 rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Consultation - {selectedConsultation?.staffName}</DialogTitle>
            <DialogDescription>
              Video consultation session with {selectedConsultation?.staffName}. Use the controls to manage the call.
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full bg-black">
            {/* Header with minimal controls */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-white">
                <Video className="w-4 h-4" />
                <span className="text-sm font-medium">Consultation with {selectedConsultation?.staffName}</span>
              </div>
              <Badge className={cn(
                callStatus === 'connected' && 'bg-green-500 text-white',
                callStatus === 'joined' && 'bg-blue-500 text-white',
                callStatus === 'error' && 'bg-red-500 text-white'
              )}>
                {callStatus}
              </Badge>
            </div>

            {/* Leave Call Button - Top Right Corner */}
            <Button 
              onClick={leaveCall} 
              variant="destructive" 
              size="sm"
              className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Leave Call
            </Button>

            {/* Video Container - Full Screen */}
            <div id="client-video-container" className="w-full h-full bg-gray-900" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultationManager; 