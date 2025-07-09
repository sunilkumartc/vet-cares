import { useState, useRef, useCallback } from 'react';

export function useAutoComplete({ field, patient, currentText = "" }) {
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const controller = useRef(null);

  const fetchSuggestion = useCallback(async (text) => {
    // Abort previous request if still pending
    if (controller.current) {
      controller.current.abort();
    }
    
    controller.current = new AbortController();
    
    // Don't fetch if text is too short
    if (!text || text.trim().length < 3) {
      setSuggestion("");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/soap/autocomplete", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          field, 
          currentText: text,
          patient: patient || null
        }),
        signal: controller.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSuggestion(data.suggestion || "");
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching autocomplete suggestion:', error);
      setError(error.message);
      setSuggestion("");
    } finally {
      setIsLoading(false);
    }
  }, [field, patient]);

  const clearSuggestion = useCallback(() => {
    setSuggestion("");
    setError(null);
  }, []);

  const acceptSuggestion = useCallback(() => {
    return suggestion;
  }, [suggestion]);

  return {
    suggestion,
    isLoading,
    error,
    fetchSuggestion,
    clearSuggestion,
    acceptSuggestion
  };
} 