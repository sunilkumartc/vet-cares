import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StickyNote, Edit, Trash2, Clock, User, AlertTriangle, History, ChevronDown, ChevronRight } from "lucide-react";
import { format, isAfter, parseISO, differenceInHours } from "date-fns";

const categoryColors = {
  behavioral: "bg-red-100 text-red-800 border-red-200",
  medical_preference: "bg-blue-100 text-blue-800 border-blue-200",
  payment: "bg-orange-100 text-orange-800 border-orange-200",
  appointment_preference: "bg-green-100 text-green-800 border-green-200",
  handling: "bg-purple-100 text-purple-800 border-purple-200",
  owner_preference: "bg-cyan-100 text-cyan-800 border-cyan-200",
  clinic_workflow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  general: "bg-gray-100 text-gray-800 border-gray-200"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

export default function MemoList({ memos, loading, onEdit, onDelete, canEditMemo, currentUser, showClientPetInfo = false }) {
  const [expandedHistory, setExpandedHistory] = useState({});

  const toggleHistory = (memoId) => {
    setExpandedHistory(prev => ({
      ...prev,
      [memoId]: !prev[memoId]
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (memos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <StickyNote className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Memos Found</h3>
          <p className="text-gray-600">Add internal notes to track important information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map((memo) => {
        const isExpired = memo.expires_on && isAfter(new Date(), parseISO(memo.expires_on));
        const isUrgent = memo.priority === 'urgent';
        const canEdit = canEditMemo ? canEditMemo(memo) : false;
        const hasEditHistory = memo.edit_history && memo.edit_history.length > 0;
        const hoursSinceCreated = differenceInHours(new Date(), new Date(memo.created_date));
        
        return (
          <Card key={memo.id} className={`transition-all duration-200 ${
            isExpired ? 'opacity-60 bg-gray-50' : 
            isUrgent ? 'border-l-4 border-l-red-500 shadow-md' : 
            'hover:shadow-md'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StickyNote className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                  <h3 className={`font-semibold ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
                    {memo.title}
                  </h3>
                  {isExpired && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                      Expired
                    </Badge>
                  )}
                  {hasEditHistory && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      Edited
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${priorityColors[memo.priority]} capitalize text-xs`}>
                    {memo.priority}
                  </Badge>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(memo)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canEdit && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(memo)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Badge className={`${categoryColors[memo.category]} text-xs`}>
                  {memo.category.replace('_', ' ')}
                </Badge>
                
                <p className={`text-sm ${isExpired ? 'text-gray-500' : 'text-gray-700'}`}>
                  {memo.content}
                </p>

                {memo.tags && memo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {memo.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {memo.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(memo.created_date), 'MMM d, yyyy h:mm a')}
                    </div>
                    {memo.last_edited_at && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Edit className="w-3 h-3" />
                        Edited {format(new Date(memo.last_edited_at), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {memo.expires_on && (
                      <div className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : ''}`}>
                        <AlertTriangle className="w-3 h-3" />
                        Expires: {format(parseISO(memo.expires_on), 'MMM d, yyyy')}
                      </div>
                    )}
                    {!canEdit && memo.author === currentUser?.name && hoursSinceCreated > 24 && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        Edit expired ({Math.floor(hoursSinceCreated)}h ago)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Edit History Section */}
                {hasEditHistory && (
                  <Collapsible open={expandedHistory[memo.id]} onOpenChange={() => toggleHistory(memo.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-700 p-0 mt-2">
                        {expandedHistory[memo.id] ? (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Hide Edit History
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3 h-3 mr-1" />
                            Show Edit History ({memo.edit_history.length})
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <History className="w-4 h-4" />
                          Edit History
                        </div>
                        {memo.edit_history.map((edit, index) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
                            <div className="text-xs text-gray-600 mb-1">
                              {format(new Date(edit.edited_at), 'MMM d, yyyy h:mm a')} by {edit.edited_by}
                            </div>
                            {edit.previous_title !== memo.title && (
                              <div className="text-xs">
                                <span className="text-gray-500">Previous title:</span> {edit.previous_title}
                              </div>
                            )}
                            <div className="text-xs">
                              <span className="text-gray-500">Previous content:</span> {edit.previous_content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}