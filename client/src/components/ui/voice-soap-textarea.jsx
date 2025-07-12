import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from './textarea';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Volume2,
  RotateCcw
} from 'lucide-react';
import { useAutoComplete } from '@/hooks/useAutoComplete';

export function VoiceSoapTextarea({ 
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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [recognition, setRecognition] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const { 
    suggestion, 
    isLoading, 
    error, 
    fetchSuggestion, 
    clearSuggestion 
  } = useAutoComplete({ field, patient });

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
        setIsTranscribing(true);
        console.log('🎤 Voice recognition started');
      };
      
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsTranscribing(false);
        if (event.error === 'no-speech') {
          alert('No speech detected. Please try again.');
        }
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
        setIsTranscribing(false);
        console.log('🎤 Voice recognition ended');
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported');
    }
  }, []);

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
    if (e.key === 'Tab' && suggestion && showSuggestions) {
      e.preventDefault();
      acceptSuggestion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearSuggestion();
      setShowSuggestions(false);
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
    setShowSuggestions(false);
  };

  // Start/stop voice recognition
  const toggleVoiceRecognition = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
    }
  };

  // Insert transcribed text
  const insertTranscript = () => {
    if (!transcript.trim()) return;
    
    const currentValue = value || '';
    const newValue = currentValue + (currentValue ? ' ' : '') + transcript;
    onChange({ target: { value: newValue } });
    setTranscript('');
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Show suggestion when available
  useEffect(() => {
    if (suggestion && !isLoading && !error) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestion, isLoading, error]);

  // Clear suggestion when value changes significantly
  useEffect(() => {
    if (!value || value.trim().length < 3) {
      clearSuggestion();
      setShowSuggestions(false);
    }
  }, [value, clearSuggestion]);

  // Simulate audio level for visual feedback
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  return (
    <div className="space-y-3">
      {/* Voice Control Bar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={toggleVoiceRecognition}
          disabled={!recognition || disabled}
          className="flex items-center gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Recording
            </>
          )}
        </Button>
        
        {/* Audio Level Indicator */}
        {isListening && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-8 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 transition-all duration-100"
                style={{ height: `${audioLevel}%` }}
              />
            </div>
            <Volume2 className="w-4 h-4 text-red-500" />
          </div>
        )}
        
        {/* Transcription Status */}
        {isTranscribing && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Listening...
          </Badge>
        )}
        
        {/* Insert Transcript Button */}
        {transcript && !isListening && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={insertTranscript}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Insert Transcript
          </Button>
        )}
      </div>

      {/* Transcript Preview */}
      {transcript && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Transcribed Text:</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTranscript('')}
                className="h-6 w-6 p-0"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-blue-700">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`${className} ${showSuggestions ? 'pb-8' : ''}`}
          disabled={disabled}
          {...props}
        />
        
        {/* AI Suggestion Overlay */}
        {showSuggestions && (
          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="flex-1">
                <span className="text-gray-500">AI Suggestion: </span>
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
            <div className="bg-red-50 border border-red-200 rounded-md p-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI error
            </div>
          </div>
        )}
      </div>
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