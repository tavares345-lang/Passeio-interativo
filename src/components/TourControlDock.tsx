import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Layers,
  Pause,
  Play,
} from 'lucide-react';
import React from 'react';
import type {CameraPreset, CameraTelemetry} from '../types/tour';

interface TourControlDockProps {
  currentIndex: number;
  totalStops: number;
  currentPlaceName: string | null;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  onPrevStop: () => void;
  onNextStop: () => void;
  cameraPreset: CameraPreset;
  onChangeCameraPreset: (preset: CameraPreset) => void;
  mapStyleMode: 'HYBRID' | 'SATELLITE';
  onToggleMapStyleMode: () => void;
  viewDimension: '3d' | '2d';
  onToggleViewDimension: () => void;
  webglSupported: boolean;
  streetViewOpen: boolean;
  onToggleStreetView: () => void;
  hasSelectedPlace: boolean;
  panelsVisible: boolean;
  onTogglePanels: () => void;
  telemetry: CameraTelemetry | null;
}

const PRESETS: {id: CameraPreset; label: string}[] = [
  {id: 'aerial', label: 'Panorâmica'},
  {id: 'cinematic', label: 'Voo Médio'},
  {id: 'close', label: 'Aproximada'},
];

export const TourControlDock: React.FC<TourControlDockProps> = ({
  currentIndex,
  totalStops,
  currentPlaceName,
  isAutoPlaying,
  onToggleAutoPlay,
  onPrevStop,
  onNextStop,
  cameraPreset,
  onChangeCameraPreset,
  mapStyleMode,
  onToggleMapStyleMode,
  viewDimension,
  onToggleViewDimension,
  webglSupported,
  streetViewOpen,
  onToggleStreetView,
  hasSelectedPlace,
  panelsVisible,
  onTogglePanels,
  telemetry,
}) => {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      {/* Compact Camera Telemetry Bar */}
      {viewDimension === '3d' && telemetry && (
        <div className="hidden items-center gap-3 rounded-lg border border-white/10 bg-[#0E1114]/78 px-3 py-1 text-[11px] text-slate-300 backdrop-blur-md sm:flex">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <Compass className="h-3 w-3 text-sky-400" aria-hidden="true" />
            Rumo {Math.round(((telemetry.heading % 360) + 360) % 360)}°
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Inclinação {Math.round(telemetry.tilt)}°
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Alcance {Math.round(telemetry.range).toLocaleString('pt-BR')} m
          </span>
        </div>
      )}

      {/* Main Control Dock */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#0E1114]/88 px-3 py-2 shadow-2xl backdrop-blur-md">
        {/* Itinerary Stepper */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevStop}
            disabled={totalStops === 0}
            aria-label="Parada anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/12 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleAutoPlay}
            disabled={totalStops === 0}
            className={`flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              isAutoPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {isAutoPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pausar passeio</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Passeio guiado</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNextStop}
            disabled={totalStops === 0}
            aria-label="Próxima parada"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/12 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {totalStops > 0 && currentIndex >= 0 && (
          <div className="hidden items-center gap-2 border-l border-white/12 pl-2.5 text-xs md:flex">
            <span className="font-mono font-medium text-sky-300 tabular-nums">
              {String(currentIndex + 1).padStart(2, '0')}/
              {String(totalStops).padStart(2, '0')}
            </span>
            {currentPlaceName && (
              <span className="max-w-[170px] truncate text-slate-200">
                {currentPlaceName}
              </span>
            )}
          </div>
        )}

        {/* Camera Presets */}
        {viewDimension === '3d' && (
          <div className="hidden items-center gap-1 rounded-lg bg-white/6 p-1 lg:flex">
            {PRESETS.map((preset) => {
              const active = cameraPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeCameraPreset(preset.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    active
                      ? 'bg-white/16 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Map Mode & View Controls */}
        <div className="flex items-center gap-1.5 border-l border-white/12 pl-2">
          <button
            type="button"
            onClick={onToggleMapStyleMode}
            title="Alternar rótulos das ruas no mapa"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span>{mapStyleMode === 'HYBRID' ? 'Híbrido' : 'Satélite'}</span>
          </button>

          {viewDimension === '2d' && hasSelectedPlace && (
            <button
              type="button"
              onClick={onToggleStreetView}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                streetViewOpen
                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/12 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5 text-sky-400" />
              <span>{streetViewOpen ? 'Mapa Aéreo' : 'Visão 360°'}</span>
            </button>
          )}

          {webglSupported && (
            <button
              type="button"
              onClick={onToggleViewDimension}
              className="flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 font-mono text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              {viewDimension === '3d' ? 'Ver 2D' : 'Ver 3D'}
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePanels}
            aria-label={panelsVisible ? 'Ocultar painéis' : 'Mostrar guia'}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            {panelsVisible ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Modo Cinema</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Mostrar Guia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
