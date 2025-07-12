import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from './textarea';
import { Button } from './button';
import { Mic, MicOff, Loader2, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';

export default function VetSoapTextarea({
  section,
  value,
  onChange,
  species,
  ageGroup,
  reason,
  doctorId,
  placeholder = '',
  rows = 6,
  className = '',
  disabled = false,
  usePrompt = false,
}) {
  const textareaRef = useRef(null);
  const componentRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typo, setTypo] = useState(null);
  const [spellErrors, setSpellErrors] = useState([]);
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false);
  const [paraphrases, setParaphrases] = useState([]);
  const [paraphrasing, setParaphrasing] = useState(false);

  // Load Typo.js and vet dictionary
  useEffect(() => {
    async function loadDictionary() {
      if (!window.Typo) {
        setDictionaryLoaded(false);
        return;
      }
      try {
        const aff = await fetch('/vet-dictionary.aff').then(r => r.text());
        const dic = await fetch('/vet-dictionary.dic').then(r => r.text());
        const t = new window.Typo('en_US', aff, dic, { platform: 'any' });
        setTypo(t);
        setDictionaryLoaded(true);
      } catch {
        setDictionaryLoaded(false);
      }
    }
    loadDictionary();
  }, []);

  // Handle clicks outside component to clear suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        setSuggestions([]);
        setParaphrases([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Spell check
  useEffect(() => {
    if (!typo || !value) return;
    const words = value.split(/\s+/);
    const errors = [];
    words.forEach((word, idx) => {
      const clean = word.replace(/[^\w]/g, '');
      if (clean.length > 2 && !typo.check(clean)) {
        errors.push({ word: clean, idx });
      }
    });
    setSpellErrors(errors);
  }, [value, typo]);

  // Track if user is actively typing
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Handle textarea input to detect user typing
  const handleTextareaChange = (e) => {
    setIsUserTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to mark typing as stopped after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 2000);
    
    // Call the original onChange
    onChange(e);
  };

  // Fetch suggestions only when user is actively typing
  useEffect(() => {
    if (!value || value.trim().length < 3 || !isUserTyping) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoading(true);
    fetch('/api/vet-soap-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section,
        input_text: value,
        species,
        age_group: ageGroup,
        reason,
        doctor_id: doctorId,
        use_prompt: usePrompt,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!ignore && data.success) setSuggestions(data.suggestions || []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
    return () => { ignore = true; };
  }, [value, section, species, ageGroup, reason, doctorId, usePrompt, isUserTyping]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Voice input
  const recognitionRef = useRef(null);
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setIsTranscribing(true);
      };
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript);
        setIsListening(false);
        setIsTranscribing(false);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsTranscribing(false);
      };
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setIsTranscribing(false);
      };
    }
  }, []);

  const startVoice = () => {
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
    }
  };
  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  // Insert suggestion at cursor
  const insertSuggestion = (suggestion) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newValue = value.slice(0, start) + suggestion + value.slice(end);
    setIsUserTyping(true); // Mark as user typing when inserting suggestion
    onChange({ target: { value: newValue } });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + suggestion.length, start + suggestion.length);
    }, 0);
  };

  // Insert transcript at cursor
  const insertTranscript = () => {
    if (!transcript.trim()) return;
    
    const currentValue = value || '';
    const newValue = currentValue + (currentValue ? ' ' : '') + transcript;
    setIsUserTyping(true); // Mark as user typing when inserting transcript
    onChange({ target: { value: newValue } });
    setTranscript('');
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Paraphrase functionality - processes current textarea content
  const handleParaphrase = async () => {
    if (!value || value.trim().length < 10) return;
    
    setParaphrasing(true);
    try {
      const response = await fetch('/api/vet-soap-paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          input_text: value,
          species,
          age_group: ageGroup,
          reason,
          doctor_id: doctorId,
          use_prompt: true, // Always use prompts for clinical correction
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setParaphrases(data.paraphrases || []);
        setSuggestions([]); // Clear suggestions when paraphrasing
      }
    } catch (error) {
      console.error('Paraphrase error:', error);
    } finally {
      setParaphrasing(false);
    }
  };

  // Replace text with paraphrase and clear everything
  const useParaphrase = (paraphrase) => {
    setIsUserTyping(false); // Don't trigger suggestions when using paraphrase
    onChange({ target: { value: paraphrase } });
    setParaphrases([]);
    setSuggestions([]);
  };

  // Check if there's enough content for paraphrasing (10+ words)
  const hasEnoughContent = value && value.trim().split(/\s+/).length >= 10;

  return (
    <div ref={componentRef} className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant={isListening ? "destructive" : "outline"} 
          size="sm" 
          onClick={isListening ? stopVoice : startVoice} 
          disabled={!recognitionRef.current || disabled}
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
              Voice
            </>
          )}
        </Button>
        
        {/* Paraphrase button next to voice button */}
        {hasEnoughContent && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleParaphrase}
            disabled={paraphrasing || disabled}
            className="flex items-center gap-2"
          >
            {paraphrasing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            {paraphrasing ? 'Processing...' : 'Paraphrase'}
          </Button>
        )}
        
        {isTranscribing && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Listening...</span>}
        {loading && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Suggestions...</span>}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        rows={rows}
        className={className}
        disabled={disabled}
      />
      
      {/* Transcript with Insert Option */}
      {transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Transcribed Text:</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertTranscript}
                className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Insert
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTranscript('')}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          <p className="text-sm text-blue-700">{transcript}</p>
        </div>
      )}

      {/* Paraphrase Options */}
      {paraphrases.length > 0 && (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-gray-700">Clinically Correct Options:</div>
          {paraphrases.map((paraphrase, i) => (
            <div key={i} className="flex items-start gap-2 bg-green-50 border border-green-200 rounded p-3 text-sm">
              <div className="flex-1">
                <div className="font-medium text-green-800 mb-1">Option {i + 1}:</div>
                <div className="text-green-700">{paraphrase}</div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => useParaphrase(paraphrase)}
                className="text-green-600 border-green-300 hover:bg-green-100"
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-2 space-y-1">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-2 text-sm cursor-pointer hover:bg-blue-100" onClick={() => insertSuggestion(s.text)}>
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{s.text}</span>
              {s.source === 'openai' && <span className="ml-auto text-xs text-blue-500">AI</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 