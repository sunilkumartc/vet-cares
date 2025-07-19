import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { CalendarIcon, Video, Clock, User, Phone, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import ClientSessionManager from '../../lib/clientSession';

const VideoConsultationDaily = ({ tenantId, staffId }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [callFrame, setCallFrame] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [emailStatus, setEmailStatus] = useState(null);
  const [patientEmail, setPatientEmail] = useState('');
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    patientName: '',
    patientId: '',
    scheduledTime: new Date(),
    duration: 30,
    notes: ''
  });

  const [joinForm, setJoinForm] = useState({
    meetingId: '',
    userType: 'staff'
  });

  // Use hardcoded values for testing
  const effectiveTenantId = tenantId || 'test-tenant-123';
  const effectiveStaffId = staffId || 'test-staff-456';

  // Load Daily.co script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => {
      console.log('Daily.co script loaded');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://unpkg.com/@daily-co/daily-js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Load meetings on component mount
  useEffect(() => {
    loadMeetings();
  }, [effectiveTenantId, effectiveStaffId]);

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

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/daily/meetings/${effectiveTenantId}/${effectiveStaffId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMeetings(data.meetings);
      } else {
        throw new Error(data.error || 'Failed to load meetings');
      }
    } catch (err) {
      console.error('Error loading meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: effectiveTenantId,
          staffId: effectiveStaffId,
          patientName: scheduleForm.patientName,
          patientId: scheduleForm.patientId,
          scheduledTime: scheduleForm.scheduledTime.toISOString(),
          duration: scheduleForm.duration,
          notes: scheduleForm.notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

    const data = await response.json();
      if (data.success) {
        console.log('Meeting created:', data);
        
        // Handle email status
        if (data.emailStatus) {
          setEmailStatus(data.emailStatus);
          setCurrentMeeting(data);
          
          if (data.emailStatus.patientEmailRequired) {
            // Show email input modal
            setShowEmailModal(true);
          } else {
            // Email was sent successfully
            alert(`Meeting created successfully! Email sent to ${data.emailStatus.patientEmail}`);
          }
        }
        
        setShowScheduleForm(false);
        setScheduleForm({
          patientName: '',
          patientId: '',
          scheduledTime: new Date(),
          duration: 30,
          notes: ''
        });
        loadMeetings(); // Refresh meetings list
      } else {
        throw new Error(data.error || 'Failed to create meeting');
      }
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily/get-meeting-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: joinForm.meetingId,
          userId: effectiveStaffId,
          userType: joinForm.userType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log('Meeting token received:', data);
        setShowJoinForm(false);
        await joinVideoCall(data.roomUrl, data.token, data.userName);
      } else {
        throw new Error(data.error || 'Failed to get meeting token');
      }
    } catch (err) {
      console.error('Error joining meeting:', err);
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
      setCurrentMeeting({ roomUrl, userName });

      // Wait for modal to open and container to be available
      setTimeout(async () => {
        const container = document.getElementById('video-container');
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
          console.log('Joined meeting successfully');
          setCallStatus('joined');
        });

        dailyCallFrame.on('left-meeting', () => {
          console.log('Left meeting');
          setIsInCall(false);
          setCallStatus('idle');
          setCurrentMeeting(null);
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
    setCurrentMeeting(null);
    setShowVideoModal(false);
    cleanupCallFrame();
  };

  const handleSendConsultationEmail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily/send-consultation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: currentMeeting.meetingId,
          email: patientEmail,
          patientName: emailStatus.patientName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert('Consultation email sent successfully!');
        setShowEmailModal(false);
        setPatientEmail('');
        setEmailStatus(null);
        setCurrentMeeting(null);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending consultation email:', err);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Online Consultation Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => setShowScheduleForm(true)}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              Schedule New Meeting
            </Button>
            <Button 
              onClick={() => setShowJoinForm(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Join Meeting
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Meetings</h3>
            {loading ? (
              <div className="text-center py-8">Loading meetings...</div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No meetings scheduled. Create your first consultation!
              </div>
            ) : (
              <div className="grid gap-4">
                {meetings.map((meeting) => (
                  <Card key={meeting.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{meeting.patientName}</span>
                          {getStatusBadge(meeting.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>Scheduled: {formatDateTime(meeting.scheduledTime)}</div>
                          <div>Duration: {meeting.duration} minutes</div>
                          <div>Expires: {formatDateTime(meeting.tokenExpiry)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {meeting.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setJoinForm({
                                meetingId: meeting.id,
                                userType: 'staff'
                              });
                              setShowJoinForm(true);
                            }}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Meeting Modal */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Consultation</DialogTitle>
            <DialogDescription>
              Create a new video consultation meeting with patient details and scheduling.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-4">
            <div>
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                value={scheduleForm.patientName}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, patientName: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                value={scheduleForm.patientId}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, patientId: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Schedule Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleForm.scheduledTime && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleForm.scheduledTime ? format(scheduleForm.scheduledTime, "PPP HH:mm") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleForm.scheduledTime}
                    onSelect={(date) => setScheduleForm(prev => ({ ...prev, scheduledTime: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={scheduleForm.duration.toString()}
                onValueChange={(value) => setScheduleForm(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about the consultation..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowScheduleForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Meeting Modal */}
      <Dialog open={showJoinForm} onOpenChange={setShowJoinForm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Join Meeting</DialogTitle>
            <DialogDescription>
              Enter the meeting ID to join an existing video consultation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinMeeting} className="space-y-4">
            <div>
              <Label htmlFor="meetingId">Meeting ID</Label>
              <Input
                id="meetingId"
                value={joinForm.meetingId}
                onChange={(e) => setJoinForm(prev => ({ ...prev, meetingId: e.target.value }))}
                placeholder="Enter meeting ID"
                required
              />
            </div>

            <div>
              <Label htmlFor="userType">Join as</Label>
              <Select
                value={joinForm.userType}
                onValueChange={(value) => setJoinForm(prev => ({ ...prev, userType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff Member</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Joining...' : 'Join Meeting'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowJoinForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email Input Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Consultation Email</DialogTitle>
            <DialogDescription>
              {emailStatus?.isExistingPatient 
                ? `No email found for ${emailStatus.patientName}. Please provide an email address to send the consultation details.`
                : `Please provide an email address to send consultation details to ${emailStatus?.patientName}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="patientEmail">Email Address</Label>
              <Input
                id="patientEmail"
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="Enter patient's email address"
                required
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What will be sent:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Consultation date and time</li>
                <li>• Doctor's name</li>
                <li>• Direct link to join the video call</li>
                <li>• Preparation instructions</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSendConsultationEmail}
                disabled={loading || !patientEmail}
                className="flex-1"
              >
                {loading ? 'Sending...' : 'Send Email'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEmailModal(false);
                  setPatientEmail('');
                  setEmailStatus(null);
                  setCurrentMeeting(null);
                }}
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
            <DialogTitle>Video Consultation - {currentMeeting?.userName}</DialogTitle>
            <DialogDescription>
              Video consultation session with {currentMeeting?.userName}. Use the controls to manage the call.
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full bg-black">
            {/* Header with minimal controls */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-white">
                <Video className="w-4 h-4" />
                <span className="text-sm font-medium">{currentMeeting?.userName}</span>
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
              <X className="w-4 h-4 mr-1" />
              Leave Call
            </Button>

            {/* Video Container - Full Screen */}
            <div id="video-container" className="w-full h-full bg-gray-900" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoConsultationDaily;