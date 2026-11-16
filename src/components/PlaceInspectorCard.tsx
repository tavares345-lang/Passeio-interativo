import {
  Calendar,
  Clock,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Orbit,
  Pause,
  Play,
  Square,
  Star,
  Sun,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import React, {useMemo} from 'react';
import type {
  AudioGuideControls,
  AudioPlaybackRate,
} from '../hooks/useAudioGuide';
import {
  BH_AERIAL_FALLBACK_IMAGE,
  deriveTravelTips,
} from '../services/placesTourService';
import type {RouteSegmentInfo, TourPlace} from '../types/tour';

interface PlaceInspectorCardProps {
  place: TourPlace | null;
  stopNumber: number | null;
  onClose: () => void;
  onOrbitPlace: () => void;
  onComputeRoute: () => void;
  isComputingRoute: boolean;
  routeInfo: RouteSegmentInfo | null;
  routeError: string | null;
  canComputeRoute: boolean;
  is3DMode: boolean;
  streetViewOpen: boolean;
  onToggleStreetView: () => void;
  audioGuide: AudioGuideControls;
}

const PLAYBACK_RATES: AudioPlaybackRate[] = [0.9, 1, 1.25];

export const PlaceInspectorCard: React.FC<PlaceInspectorCardProps> = ({
  place,
  stopNumber,
  onClose,
  onOrbitPlace,
  onComputeRoute,
  isComputingRoute,
  routeInfo,
  routeError,
  canComputeRoute,
  is3DMode,
  streetViewOpen,
  onToggleStreetView,
  audioGuide,
}) => {
  const travelTips = useMemo(
    () => (place ? deriveTravelTips(place) : null),
    [place]
  );

  if (!place || !travelTips) return null;

  return (
    <section
      aria-label={`Detalhes de ${place.displayName}`}
      className="pointer-events-auto flex max-h-[calc(100vh-8.5rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0E1114]/88 shadow-2xl backdrop-blur-md sm:w-[360px]"
    >
      {/* Hero Photo */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-900">
        <img
          src={place.photoUrl || BH_AERIAL_FALLBACK_IMAGE}
          alt={place.displayName}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E1114] via-black/35 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes do local"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="absolute right-4 bottom-3 left-4">
          {stopNumber !== null && (
            <p className="font-mono text-xs font-medium tracking-wide text-sky-300 tabular-nums">
              Parada {String(stopNumber).padStart(2, '0')}
            </p>
          )}
          <h2 className="font-display mt-0.5 text-xl leading-snug font-semibold text-balance text-white">
            {place.displayName}
          </h2>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="hud-scroll space-y-4 overflow-y-auto p-4">
        {/* Unboxed Metadata Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
          {place.primaryTypeDisplayName && (
            <span>{place.primaryTypeDisplayName}</span>
          )}
          {place.primaryTypeDisplayName && place.rating != null && (
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
          )}
          {place.rating != null && (
            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-300">
              <Star
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {place.rating.toFixed(1).replace('.', ',')}
              {place.userRatingCount != null && (
                <span className="text-slate-400">
                  ({place.userRatingCount.toLocaleString('pt-BR')})
                </span>
              )}
            </span>
          )}
          {place.isOpenNow !== null && place.isOpenNow !== undefined && (
            <>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span
                className={
                  place.isOpenNow ? 'text-emerald-400' : 'text-slate-400'
                }
              >
                {place.isOpenNow ? 'Aberto agora' : 'Fechado no momento'}
              </span>
            </>
          )}
        </div>

        {/* Web Speech API Audio Guide */}
        <div className="rounded-lg border border-sky-400/20 bg-sky-500/[0.07] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-300 uppercase">
              <Volume2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              Guia de Áudio
            </h3>

            {audioGuide.supported && (
              <div
                className="flex items-center gap-0.5 rounded-md bg-black/30 p-0.5"
                role="group"
                aria-label="Velocidade da narração"
              >
                {PLAYBACK_RATES.map((r) => {
                  const activeRate = audioGuide.rate === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => audioGuide.setRate(r)}
                      className={`font-mono rounded px-1.5 py-0.5 text-[10px] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        activeRate
                          ? 'bg-sky-500 font-semibold text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {r === 1 ? '1x' : `${String(r).replace('.', ',')}x`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!audioGuide.supported ? (
            <p className="mt-2 text-xs text-slate-400">
              Síntese de voz indisponível neste navegador.
            </p>
          ) : (
            (() => {
              const isActivePlace =
                audioGuide.activePlaceId === place.id &&
                audioGuide.status !== 'idle';
              const isPlaying =
                isActivePlace && audioGuide.status === 'playing';
              const isPaused = isActivePlace && audioGuide.status === 'paused';

              return (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        type="button"
                        onClick={audioGuide.pause}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-sky-300"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pausar narração
                      </button>
                    ) : isPaused ? (
                      <button
                        type="button"
                        onClick={audioGuide.resume}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-sky-300"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Continuar narração
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => audioGuide.playPlace(place, stopNumber)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-sky-300"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Ouvir guia narrado
                      </button>
                    )}

                    {isActivePlace && (
                      <button
                        type="button"
                        onClick={audioGuide.stop}
                        aria-label="Parar guia de áudio"
                        title="Parar narração"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-slate-200 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {isActivePlace && audioGuide.currentSentenceText && (
                    <div className="rounded-md bg-black/25 px-2.5 py-2 text-[11px] leading-relaxed text-slate-200">
                      <span className="font-mono mr-1.5 text-[10px] text-sky-300 tabular-nums">
                        [{audioGuide.currentSentenceIndex + 1}/
                        {audioGuide.totalSentences}]
                      </span>
                      {audioGuide.currentSentenceText}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {place.editorialSummary && (
          <p className="text-sm leading-relaxed text-slate-200">
            {place.editorialSummary}
          </p>
        )}

        <div className="space-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400"
              aria-hidden="true"
            />
            <span>{place.formattedAddress}</span>
          </div>

          {place.weekdayDescriptions && place.weekdayDescriptions.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-slate-300 transition-colors hover:text-white">
                <Clock
                  className="h-3.5 w-3.5 shrink-0 text-sky-400"
                  aria-hidden="true"
                />
                <span>Horários de funcionamento</span>
              </summary>
              <ul className="mt-2 space-y-1 pl-5.5 text-[11px] text-slate-400">
                {place.weekdayDescriptions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Travel Tips Section */}
        <div className="space-y-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-300 uppercase">
              <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Dicas de Viagem
            </h3>
            {travelTips.popularityNote && (
              <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                {place.userRatingCount?.toLocaleString('pt-BR')} aval.
              </span>
            )}
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Users
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <div>
                <dt className="font-medium text-slate-200">
                  Horários de pico
                </dt>
                <dd className="mt-0.5 leading-relaxed text-slate-300 tabular-nums">
                  {travelTips.peakHours}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <dt className="font-medium text-slate-200">
                  Horário mais tranquilo
                </dt>
                <dd className="mt-0.5 leading-relaxed text-slate-300 tabular-nums">
                  {travelTips.quietWindow}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400"
                aria-hidden="true"
              />
              <div>
                <dt className="font-medium text-slate-200">
                  Melhor época para visitar
                </dt>
                <dd className="mt-0.5 leading-relaxed text-slate-300">
                  {travelTips.bestSeason}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Route Result */}
        {routeInfo && (
          <div className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-3 text-xs">
            <p className="font-medium text-sky-200">
              Trajeto: {routeInfo.fromName} → {routeInfo.toName}
            </p>
            <p className="font-mono mt-1 text-slate-200 tabular-nums">
              {routeInfo.distanceText} · {routeInfo.durationText} de carro
            </p>
          </div>
        )}

        {routeError && (
          <p className="text-xs text-amber-300">{routeError}</p>
        )}

        {/* Primary Actions */}
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          {is3DMode ? (
            <button
              type="button"
              onClick={onOrbitPlace}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-sky-300"
            >
              <Orbit className="h-3.5 w-3.5" />
              Orbitar 360°
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleStreetView}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-sky-300"
            >
              <Compass className="h-3.5 w-3.5" />
              {streetViewOpen ? 'Voltar ao mapa' : 'Street View 360°'}
            </button>
          )}

          {canComputeRoute && (
            <button
              type="button"
              onClick={onComputeRoute}
              disabled={isComputingRoute}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 py-2 text-xs font-medium whitespace-nowrap text-white transition-colors hover:bg-white/15 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              {isComputingRoute ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
              Traçar rota
            </button>
          )}

          {place.googleMapsURI && (
            <a
              href={place.googleMapsURI}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
