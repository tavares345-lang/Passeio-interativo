import {CarFront, ChevronLeft, Loader2, MapPin, Star} from 'lucide-react';
import React from 'react';
import {
  BH_AERIAL_FALLBACK_IMAGE,
  TOUR_CATEGORIES,
} from '../services/placesTourService';
import type {TourCategoryId, TourPlace} from '../types/tour';
import {SearchBar} from './SearchBar';

interface TourSidebarProps {
  isOpen: boolean;
  onCollapse: () => void;
  activeCategory: TourCategoryId;
  onSelectCategory: (categoryId: TourCategoryId) => void;
  places: TourPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: TourPlace) => void;
  onAddSearchPlace: (place: TourPlace) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  hostName: string;
  onOpenHostIntro: () => void;
}

export const TourSidebar: React.FC<TourSidebarProps> = ({
  isOpen,
  onCollapse,
  activeCategory,
  onSelectCategory,
  places,
  selectedPlaceId,
  onSelectPlace,
  onAddSearchPlace,
  isLoading,
  errorMessage,
  onRetry,
  hostName,
  onOpenHostIntro,
}) => {
  if (!isOpen) return null;

  const biasCenter = places[0]?.location ?? null;

  return (
    <aside
      aria-label="Roteiro de Belo Horizonte"
      className="pointer-events-auto flex max-h-[calc(100vh-7.5rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0E1114]/86 shadow-2xl backdrop-blur-md sm:w-[356px]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pt-4 pb-3.5">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-tight text-white">
            Belo Horizonte 3D
          </h1>
          <p className="mt-0.5 text-xs text-slate-300">
            Passeio aéreo interativo · Minas Gerais
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          title="Ocultar guia"
          aria-label="Ocultar painel lateral"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3 border-b border-white/10 px-4 py-3.5">
        <SearchBar biasCenter={biasCenter} onSelectPlace={onAddSearchPlace} />

        <div
          role="tablist"
          aria-label="Categorias de passeio"
          className="flex flex-wrap gap-1 rounded-lg bg-white/6 p-1"
        >
          {TOUR_CATEGORIES.map((category) => {
            const active = category.id === activeCategory;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCategory(category.id)}
                className={`flex-1 basis-auto rounded-md px-2.5 py-1.5 text-center text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stops List */}
      <div className="hud-scroll flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            <p className="text-sm text-slate-300">
              Carregando pontos turísticos em Belo Horizonte...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm text-slate-200">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold whitespace-nowrap text-slate-950 transition-colors hover:bg-sky-400"
            >
              Tentar novamente
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Nenhum local encontrado para esta categoria.
          </div>
        ) : (
          <ol className="space-y-2">
            {places.map((place, index) => {
              const isSelected = place.id === selectedPlaceId;
              const numLabel = String(index + 1).padStart(2, '0');
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place)}
                    className={`group flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      isSelected
                        ? 'border-sky-400/50 bg-sky-500/15'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-slate-900">
                      <img
                        src={place.photoUrl || BH_AERIAL_FALLBACK_IMAGE}
                        alt={place.displayName}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span
                        className={`font-mono absolute top-1 left-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-black/70 text-white'
                        }`}
                      >
                        {numLabel}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2
                        className={`truncate text-sm font-medium ${
                          isSelected ? 'text-sky-300' : 'text-white'
                        }`}
                      >
                        {place.displayName}
                      </h2>

                      <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-300">
                        {place.primaryTypeDisplayName && (
                          <span className="truncate">
                            {place.primaryTypeDisplayName}
                          </span>
                        )}
                        {place.primaryTypeDisplayName && place.rating != null && (
                          <span aria-hidden="true" className="text-slate-500">
                            ·
                          </span>
                        )}
                        {place.rating != null && (
                          <span className="inline-flex shrink-0 items-center gap-1 font-mono tabular-nums text-amber-300">
                            <Star
                              className="h-3 w-3 fill-amber-400 text-amber-400"
                              aria-hidden="true"
                            />
                            {place.rating.toFixed(1).replace('.', ',')}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                        <MapPin
                          className="h-3 w-3 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {place.formattedAddress}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Transport Host Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-300">
          <CarFront
            className="h-3.5 w-3.5 shrink-0 text-sky-400"
            aria-hidden="true"
          />
          <span className="truncate">{hostName}</span>
        </div>
        <button
          type="button"
          onClick={onOpenHostIntro}
          className="shrink-0 rounded-md border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-sky-300 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Apresentação
        </button>
      </div>
    </aside>
  );
};
