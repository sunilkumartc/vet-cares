import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from './textarea';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { Loader2, Sparkles } from 'lucide-react';

export function AutoCompleteTextarea({ 
  field, 
  patient, 
  value, 
  onChange, 
  placeholder, 
  rows = 4,
  className = "",
  disabled = false,
  ...props 
}) {
  const textareaRef = useRef(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { 
    suggestion, 
    isLoading, 
    error, 
    fetchSuggestion, 
    clearSuggestion 
  } = useAutoComplete({ field, patient });

  // Debounced suggestion fetching
  const debouncedFetch = useCallback(
    debounce((text) => {
      if (text && text.trim().length >= 3) {
        fetchSuggestion(text);
      } else {
        clearSuggestion();
      }
    }, 500),
    [fetchSuggestion, clearSuggestion]
  );

  // Handle text changes
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    
    // Update cursor position
    setCursorPosition(e.target.selectionStart);
    
    // Fetch suggestions
    debouncedFetch(newValue);
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion && showSuggestion) {
      e.preventDefault();
      acceptSuggestion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearSuggestion();
      setShowSuggestion(false);
    }
  };

  // Accept suggestion
  const acceptSuggestion = () => {
    if (!suggestion || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const currentValue = value || '';
    
    // Insert suggestion at cursor position
    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition);
    
    const newValue = beforeCursor + suggestion + afterCursor;
    const newCursorPosition = cursorPosition + suggestion.length;
    
    // Update value
    onChange({ target: { value: newValue } });
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
    
    // Clear suggestion
    clearSuggestion();
    setShowSuggestion(false);
  };

  // Show suggestion when available
  useEffect(() => {
    if (suggestion && !isLoading && !error) {
      setShowSuggestion(true);
    } else {
      setShowSuggestion(false);
    }
  }, [suggestion, isLoading, error]);

  // Clear suggestion when value changes significantly
  useEffect(() => {
    if (!value || value.trim().length < 3) {
      clearSuggestion();
      setShowSuggestion(false);
    }
  }, [value, clearSuggestion]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`${className} ${showSuggestion ? 'pb-8' : ''}`}
        disabled={disabled}
        {...props}
      />
      
      {/* Suggestion overlay */}
      {showSuggestion && (
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="flex-1">
              <span className="text-gray-500">Suggestion: </span>
              {suggestion}
            </span>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
              Tab to accept
            </span>
          </div>
        </div>
      )}
      
      {/* Error indicator */}
      {error && (
        <div className="absolute top-2 right-2">
          <div className="bg-red-50 border border-red-200 rounded-md p-1 text-xs text-red-600">
            AI error
          </div>
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} 