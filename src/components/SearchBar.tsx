import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {Loader2, Search, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {
  checkQuotaError,
  mapGooglePlaceToTourPlace,
} from '../services/placesTourService';
import type {TourPlace} from '../types/tour';

interface SearchBarProps {
  biasCenter?: {lat: number; lng: number} | null;
  onSelectPlace: (place: TourPlace) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  biasCenter,
  onSelectPlace,
}) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['br'],
          language: 'pt-BR',
          region: 'br',
          ...(biasCenter
            ? {
                locationBias: {
                  center: biasCenter,
                  radius: 25000,
                },
              }
            : {}),
        };
        const res =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request
          );
        setSuggestions(res.suggestions ?? []);
        setIsOpen((res.suggestions ?? []).length > 0);
      } catch (err) {
        checkQuotaError(err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [query, placesLib, biasCenter]);

  const handleChooseSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    setIsSelecting(true);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'location',
          'formattedAddress',
          'rating',
          'userRatingCount',
          'primaryType',
          'primaryTypeDisplayName',
          'types',
          'editorialSummary',
          'photos',
          'googleMapsURI',
        ],
      });
      const mapped = mapGooglePlaceToTourPlace(place, false);
      if (mapped) {
        onSelectPlace(mapped);
        setQuery('');
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      checkQuotaError(err);
    } finally {
      sessionTokenRef.current = null;
      setIsSelecting(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Buscar lugar em Belo Horizonte..."
          aria-label="Buscar lugar em Belo Horizonte"
          className="w-full rounded-lg border border-white/12 bg-white/5 py-2.5 pr-9 pl-9 text-sm text-white placeholder-slate-400 transition-colors focus:border-sky-400/70 focus:bg-white/10 focus:outline-none"
        />
        {(isSearching || isSelecting) && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-sky-400" />
        )}
        {!isSearching && !isSelecting && query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            aria-label="Limpar busca"
            className="absolute right-2.5 rounded p-1 text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="hud-scroll absolute right-0 left-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-white/15 bg-[#12161B]/95 py-1 shadow-2xl backdrop-blur-md"
        >
          {suggestions.map((item, idx) => {
            const pred = item.placePrediction;
            if (!pred) return null;
            return (
              <li key={pred.placeId || idx}>
                <button
                  type="button"
                  onClick={() => void handleChooseSuggestion(item)}
                  className="flex w-full flex-col px-3.5 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                >
                  <span className="truncate text-sm font-medium text-white">
                    {pred.mainText?.text || pred.text.text}
                  </span>
                  {pred.secondaryText?.text && (
                    <span className="truncate text-xs text-slate-400">
                      {pred.secondaryText.text}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
