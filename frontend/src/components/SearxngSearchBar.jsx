import { useState, useRef, useEffect, useCallback } from 'react';
import client from '../api/client';
import WeatherWidget from './WeatherWidget';
import { useCustomise } from '../hooks/useCustomise';

export default function SearxngSearchBar({ app }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const custom = useCustomise();

  const searchUrl = (app.open_url || app.url || '').replace(/\/$/, '');
  const hasWeather = !!(custom.weatherApiKey && custom.weatherLocation);

  const fetchSuggestions = useCallback((q) => {
    if (abortRef.current) abortRef.current.cancel('new request');
    if (q.length < 2) { setSuggestions([]); return; }

    const source = client.CancelToken?.source?.() || null;
    abortRef.current = source;

    client.get('/searxng/autocomplete', {
      params: { q },
      cancelToken: source?.token,
    })
      .then(res => {
        if (Array.isArray(res.data)) setSuggestions(res.data);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 150);
  };

  const doSearch = (term) => {
    if (!term.trim()) return;
    window.open(`${searchUrl}/search?q=${encodeURIComponent(term.trim())}`, '_blank');
    setQuery('');
    setSuggestions([]);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(activeIdx >= 0 ? suggestions[activeIdx] : query);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    if (!focused) { setSuggestions([]); setActiveIdx(-1); }
  }, [focused]);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <div className="searxng-bar">
      {/* Weather on the left */}
      {hasWeather && (
        <WeatherWidget
          apiKey={custom.weatherApiKey}
          location={custom.weatherLocation}
          units={custom.weatherUnits}
        />
      )}

      {/* Search field on the right */}
      <div className="searxng-input-wrap">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search the web..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="searxng-input"
        />
        {query && (
          <button
            className="searxng-clear"
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); setSuggestions([]); }}
          >
            &times;
          </button>
        )}
        <button
          className="searxng-go"
          onMouseDown={(e) => { e.preventDefault(); doSearch(query); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div className="searxng-dropdown">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className={`searxng-suggestion ${i === activeIdx ? 'active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); doSearch(s); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
