import { useState, useRef, useCallback, useEffect } from 'react';

export function useSoapSuggestions({ field, patient, clinic_id }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const controller = useRef(null);

  const fetchSuggestions = useCallback(async (inputText) => {
    // Abort previous request if still pending
    if (controller.current) {
      controller.current.abort();
    }
    
    controller.current = new AbortController();
    
    // Don't fetch if text is too short
    if (!inputText || inputText.trim().length < 3) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/soap/suggest-soap", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          section: field, 
          input_text: inputText,
          patient_id: patient?.id,
          species: patient?.species,
          age_group: patient?.age ? getAgeGroup(patient.age) : null,
          clinic_id: clinic_id,
          limit: 5
        }),
        signal: controller.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        setSelectedIndex(-1);
        console.log(`✅ Found ${data.suggestions.length} suggestions for ${field}`);
      } else {
        setSuggestions([]);
        console.warn('No suggestions returned from API');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching SOAP suggestions:', error);
      setError(error.message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [field, patient, clinic_id]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(-1);
    setError(null);
  }, []);

  const selectNext = useCallback(() => {
    if (suggestions.length === 0) return;
    setSelectedIndex(prev => 
      prev < suggestions.length - 1 ? prev + 1 : 0
    );
  }, [suggestions.length]);

  const selectPrevious = useCallback(() => {
    if (suggestions.length === 0) return;
    setSelectedIndex(prev => 
      prev > 0 ? prev - 1 : suggestions.length - 1
    );
  }, [suggestions.length]);

  const getSelectedSuggestion = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      return suggestions[selectedIndex];
    }
    return null;
  }, [suggestions, selectedIndex]);

  const acceptSuggestion = useCallback((suggestion) => {
    if (!suggestion) return null;
    clearSuggestions();
    return suggestion.text;
  }, [clearSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    selectedIndex,
    fetchSuggestions,
    clearSuggestions,
    selectNext,
    selectPrevious,
    getSelectedSuggestion,
    acceptSuggestion
  };
}

// Helper function to categorize age groups
function getAgeGroup(age) {
  if (age < 1) return 'puppy/kitten';
  if (age < 7) return 'young';
  if (age < 12) return 'adult';
  return 'senior';
}

// Enhanced hook for voice input with spell checking
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognition, setRecognition] = useState(null);

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

  const startListening = useCallback(() => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    setTranscript('');
    recognition.start();
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    isTranscribing,
    recognition,
    startListening,
    stopListening,
    clearTranscript
  };
}

// Hook for spell checking with Typo.js
export function useSpellCheck() {
  const [spellErrors, setSpellErrors] = useState([]);
  const [dictionary, setDictionary] = useState(null);

  // Load Typo.js dictionary
  useEffect(() => {
    if (window.Typo) {
      try {
        const typo = new window.Typo('en_US');
        setDictionary(typo);
      } catch (error) {
        console.warn('Failed to load spell check dictionary:', error);
      }
    }
  }, []);

  const checkSpelling = useCallback((text) => {
    if (!text || !dictionary) {
      setSpellErrors([]);
      return;
    }
    
    try {
      const words = text.split(/\s+/);
      const errors = [];
      
      words.forEach((word, index) => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 2 && !dictionary.check(cleanWord)) {
          const suggestions = dictionary.suggest(cleanWord);
          errors.push({
            word: cleanWord,
            originalWord: word,
            index,
            suggestions: suggestions.slice(0, 3)
          });
        }
      });
      
      setSpellErrors(errors);
    } catch (error) {
      console.warn('Spell check error:', error);
      setSpellErrors([]);
    }
  }, [dictionary]);

  const fixSpelling = useCallback((errorIndex, suggestion) => {
    return {
      word: spellErrors[errorIndex]?.originalWord,
      suggestion,
      index: errorIndex
    };
  }, [spellErrors]);

  return {
    spellErrors,
    checkSpelling,
    fixSpelling,
    hasDictionary: !!dictionary
  };
} 