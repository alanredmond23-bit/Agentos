'use client';

/**
 * AgentOS Ops Console - Pack Search Component
 * Search input with autocomplete suggestions
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Package, Tag, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pack } from '@/app/studio/packs/page';

// ============================================
// Types
// ============================================

interface PackSearchProps {
  value: string;
  onChange: (value: string) => void;
  packs: Pack[];
  placeholder?: string;
}

interface SearchSuggestion {
  type: 'pack' | 'tag' | 'recent';
  value: string;
  label: string;
  description?: string;
}

// ============================================
// Pack Search Component
// ============================================

export function PackSearch({
  value,
  onChange,
  packs,
  placeholder = 'Search packs...',
}: PackSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pack-search-history');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored).slice(0, 5));
        } catch {
          setRecentSearches([]);
        }
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, 5);
      localStorage.setItem('pack-search-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Generate suggestions based on input
  const suggestions = useMemo((): SearchSuggestion[] => {
    if (!value.trim()) {
      // Show recent searches when input is empty
      return recentSearches.map((search) => ({
        type: 'recent' as const,
        value: search,
        label: search,
      }));
    }

    const results: SearchSuggestion[] = [];
    const lowerValue = value.toLowerCase();

    // Find matching packs
    const matchingPacks = packs
      .filter(
        (pack) =>
          pack.name.toLowerCase().includes(lowerValue) ||
          pack.description.toLowerCase().includes(lowerValue)
      )
      .slice(0, 5);

    matchingPacks.forEach((pack) => {
      results.push({
        type: 'pack',
        value: pack.name,
        label: pack.name,
        description: pack.description,
      });
    });

    // Find matching tags
    const allTags = new Set<string>();
    packs.forEach((pack) => {
      pack.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(lowerValue)) {
          allTags.add(tag);
        }
      });
    });

    Array.from(allTags)
      .slice(0, 3)
      .forEach((tag) => {
        results.push({
          type: 'tag',
          value: tag,
          label: tag,
        });
      });

    return results.slice(0, 8);
  }, [value, packs, recentSearches]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onChange(suggestion.value);
    saveToHistory(suggestion.value);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        } else if (value.trim()) {
          saveToHistory(value.trim());
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setHighlightedIndex(-1);
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted pointer-events-none">
          <Search className="w-4 h-4" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'input pl-10 pr-10 w-full',
            showDropdown && 'rounded-b-none border-b-transparent'
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full bg-white dark:bg-dark-bg-elevated border border-t-0 border-slate-200 dark:border-dark-border-primary rounded-b-lg shadow-lg overflow-hidden"
        >
          <ul className="py-1 max-h-80 overflow-y-auto">
            {/* Section Header for Recent Searches */}
            {!value.trim() && recentSearches.length > 0 && (
              <li className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider">
                Recent Searches
              </li>
            )}

            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.type}-${suggestion.value}`}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex items-start gap-3 w-full px-3 py-2 text-left transition-colors',
                    highlightedIndex === index
                      ? 'bg-slate-100 dark:bg-dark-bg-tertiary'
                      : 'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                  )}
                >
                  {/* Icon */}
                  <span className="flex-shrink-0 mt-0.5">
                    {suggestion.type === 'pack' && (
                      <Package className="w-4 h-4 text-brand-500" />
                    )}
                    {suggestion.type === 'tag' && (
                      <Tag className="w-4 h-4 text-purple-500" />
                    )}
                    {suggestion.type === 'recent' && (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-dark-text-primary">
                        {suggestion.label}
                      </span>
                      {suggestion.type === 'tag' && (
                        <span className="text-xs text-slate-400 dark:text-dark-text-muted">
                          tag
                        </span>
                      )}
                    </div>
                    {suggestion.description && (
                      <p className="text-sm text-slate-500 dark:text-dark-text-tertiary line-clamp-1">
                        {suggestion.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Clear History */}
          {!value.trim() && recentSearches.length > 0 && (
            <div className="border-t border-slate-100 dark:border-dark-border-primary px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('pack-search-history');
                }}
                className="text-xs text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary transition-colors"
              >
                Clear search history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PackSearch;
