import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Phone, 
  Mail,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export default function LinkRequestsManager({ tenantId }) {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (tenantId) {
      fetchLinkRequests();
      fetchStats();
    }
  }, [tenantId, statusFilter]);

  const fetchLinkRequests = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/mobile/clinics/${tenantId}/link-requests${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequests(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching link requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/mobile/clinics/${tenantId}/link-stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async () => {
    await updateRequestStatus('approved');
  };

  const handleReject = async () => {
    await updateRequestStatus('rejected');
  };

  const updateRequestStatus = async (status) => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/mobile/clinic-link-requests/${selectedRequest._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          responseMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowDialog(false);
          setSelectedRequest(null);
          setResponseMessage('');
          fetchLinkRequests();
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openRequestDialog = (request) => {
    setSelectedRequest(request);
    setShowDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Link Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Link Requests
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({requests.length})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({stats.pending})
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
            >
              Approved ({stats.approved})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected ({stats.rejected})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Link Requests</h3>
              <p className="text-gray-600">
                {statusFilter === 'all' 
                  ? 'No link requests found.' 
                  : `No ${statusFilter} link requests found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openRequestDialog(request)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{request.userName}</h4>
                        <p className="text-sm text-gray-600">User ID: {request.userId}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    {request.userEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{request.userEmail}</span>
                      </div>
                    )}
                    {request.userPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{request.userPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                    {request.message && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="truncate">{request.message}</span>
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequestDialog(request);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequestDialog(request);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Link Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">{selectedRequest.userName}</h4>
                <p className="text-sm text-gray-600">User ID: {selectedRequest.userId}</p>
              </div>

              <div className="space-y-2">
                {selectedRequest.userEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <span>{selectedRequest.userEmail}</span>
                  </div>
                )}
                {selectedRequest.userPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{selectedRequest.userPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Requested: {format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>

              {selectedRequest.message && (
                <div>
                  <label className="text-sm font-medium">Message from user:</label>
                  <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Response message (optional):</label>
                <Textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Add a message to send with your response..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 