import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Plus, AlertTriangle } from "lucide-react";
import { TenantMemo } from "@/api/tenant-entities";
import { isAfter, parseISO, differenceInHours } from "date-fns";

import MemoForm from "./MemoForm";
import MemoList from "./MemoList";

export default function MemoWidget({ clientId, petId, client, pet, showHeader = true }) {
  const [memos, setMemos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadMemos();
    getCurrentUser();
  }, [clientId, petId]);

  const getCurrentUser = () => {
    // Get current user from staff session
    const staffSession = localStorage.getItem('staffSession');
    if (staffSession) {
      const session = JSON.parse(staffSession);
      setCurrentUser({
        name: session.name,
        role: session.role
      });
    }
  };

  const loadMemos = async () => {
    setLoading(true);
    try {
      let filters = { is_active: true };
      
      if (petId) {
        filters.pet_id = petId;
      } else if (clientId) {
        filters.client_id = clientId;
      }
      
      // Load memos and sort by created_date (most recent first)
      const memoData = await TenantMemo.filter(filters, '-created_date');
      setMemos(memoData);
    } catch (error) {
      console.error('Error loading memos:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEditMemo = (memo) => {
    if (!currentUser) return false;
    
    // Admin can always edit
    if (currentUser.role === 'admin') return true;
    
    // Author can edit within 24 hours
    if (memo.author === currentUser.name) {
      const createdDate = new Date(memo.created_date);
      const hoursSinceCreated = differenceInHours(new Date(), createdDate);
      return hoursSinceCreated <= 24;
    }
    
    return false;
  };

  const handleSubmit = async (memoData) => {
    try {
      if (editingMemo) {
        // Create edit history before updating
        const editHistory = editingMemo.edit_history || [];
        const newHistoryEntry = {
          edited_at: new Date().toISOString(),
          edited_by: currentUser?.name || "Unknown User",
          previous_content: editingMemo.content,
          previous_title: editingMemo.title,
          edit_reason: "Updated memo"
        };
        
        const updatedData = {
          ...memoData,
          edit_history: [...editHistory, newHistoryEntry],
          last_edited_at: new Date().toISOString(),
          last_edited_by: currentUser?.name || "Unknown User"
        };
        
        await TenantMemo.update(editingMemo.id, updatedData);
      } else {
        await TenantMemo.create({
          ...memoData,
          author: currentUser?.name || "Current User"
        });
      }
      setShowForm(false);
      setEditingMemo(null);
      loadMemos();
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const handleEdit = (memo) => {
    if (canEditMemo(memo)) {
      setEditingMemo(memo);
      setShowForm(true);
    } else {
      alert('You can only edit your own memos within 24 hours of creation, or contact an admin.');
    }
  };

  const handleDelete = async (memo) => {
    if (!canEditMemo(memo)) {
      alert('You can only delete your own memos within 24 hours of creation, or contact an admin.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this memo?')) {
      try {
        await TenantMemo.update(memo.id, { is_active: false });
        loadMemos();
      } catch (error) {
        console.error('Error deleting memo:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMemo(null);
  };

  const urgentMemos = memos.filter(m => m.priority === 'urgent' && m.is_active);
  const expiredMemos = memos.filter(m => m.expires_on && isAfter(new Date(), parseISO(m.expires_on)));

  if (showForm) {
    return (
      <MemoForm
        memo={editingMemo}
        client={client}
        pet={pet}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              Internal Memos
              {(urgentMemos.length > 0 || expiredMemos.length > 0) && (
                <div className="flex gap-1">
                  {urgentMemos.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {urgentMemos.length} Urgent
                    </Badge>
                  )}
                  {expiredMemos.length > 0 && (
                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                      {expiredMemos.length} Expired
                    </Badge>
                  )}
                </div>
              )}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-amber-600 hover:bg-amber-700 gap-1"
            >
              <Plus className="w-4 h-4" />
              Add TenantMemo
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Staff-only notes for continuity of care and service preferences
          </p>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "p-6"}>
        <MemoList
          memos={memos}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEditMemo={canEditMemo}
          currentUser={currentUser}
        />
      </CardContent>
    </Card>
  );
}