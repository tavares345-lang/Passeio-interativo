import {APIProvider, useMapsLibrary} from '@vis.gl/react-google-maps';
import {AlertTriangle, Compass, Loader2, Pause, Play, Square, Volume2} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CityMap2DFallback} from './components/CityMap2DFallback';
import {CityMap3D, type CityMap3DHandle} from './components/CityMap3D';
import {PlaceInspectorCard} from './components/PlaceInspectorCard';
import {TourControlDock} from './components/TourControlDock';
import {TourSidebar} from './components/TourSidebar';
import {
  DEFAULT_TRANSPORT_HOST,
  TransportHostCard,
} from './components/TransportHostCard';
import {useAudioGuide} from './hooks/useAudioGuide';
import {
  BH_AERIAL_FALLBACK_IMAGE,
  compute3DRouteSegment,
  enrichPlaceDetails,
  fetchTourPlacesByCategory,
} from './services/placesTourService';
import type {
  CameraPreset,
  CameraTelemetry,
  RouteSegmentInfo,
  TourCategoryId,
  TourPlace,
  TransportHostProfile,
} from './types/tour';

const HOST_PROFILE_STORAGE_KEY = 'bh_tour_host_profile_v1';

function loadSavedHostProfile(): TransportHostProfile {
  try {
    const raw = window.localStorage.getItem(HOST_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_TRANSPORT_HOST;
    const parsed = JSON.parse(raw) as Partial<TransportHostProfile>;
    return {
      organizationName:
        parsed.organizationName || DEFAULT_TRANSPORT_HOST.organizationName,
      driverName: parsed.driverName || DEFAULT_TRANSPORT_HOST.driverName,
      serviceTagline:
        parsed.serviceTagline || DEFAULT_TRANSPORT_HOST.serviceTagline,
      shortBio: parsed.shortBio || DEFAULT_TRANSPORT_HOST.shortBio,
      tourPrompt: parsed.tourPrompt || DEFAULT_TRANSPORT_HOST.tourPrompt,
    };
  } catch {
    return DEFAULT_TRANSPORT_HOST;
  }
}

const API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (process.env.GOOGLE_MAPS_API_KEY as string) ||
  '';

function detectHardware3DSupport(): boolean {
  try {
    if (!window.WebGL2RenderingContext) return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return false;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
      );
      const vendor = String(
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''
      );
      const combined = `${vendor} ${renderer}`.toLowerCase();
      if (
        /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(
          combined
        )
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

const TourExperience: React.FC<{hardware3DSupported: boolean}> = ({
  hardware3DSupported,
}) => {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [canUse3D, setCanUse3D] = useState(hardware3DSupported);
  const [viewDimension, setViewDimension] = useState<'3d' | '2d'>(() =>
    hardware3DSupported ? '3d' : '2d'
  );
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [webglNoticeDismissed, setWebglNoticeDismissed] = useState(false);
  const [hostIntroOpen, setHostIntroOpen] = useState(true);
  const [hostProfile, setHostProfile] = useState<TransportHostProfile>(() =>
    loadSavedHostProfile()
  );

  const handleSaveHostProfile = useCallback((next: TransportHostProfile) => {
    setHostProfile(next);
    try {
      window.localStorage.setItem(
        HOST_PROFILE_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleResetHostProfile = useCallback(() => {
    setHostProfile(DEFAULT_TRANSPORT_HOST);
    try {
      window.localStorage.removeItem(HOST_PROFILE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    const handle3DUnsupported = () => {
      setCanUse3D(false);
      setViewDimension('2d');
    };
    window.addEventListener('gmp-3d-unsupported', handle3DUnsupported);
    return () => {
      window.removeEventListener('gmp-3d-unsupported', handle3DUnsupported);
    };
  }, []);

  const [activeCategory, setActiveCategory] =
    useState<TourCategoryId>('highlights');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [mapStyleMode, setMapStyleMode] = useState<'HYBRID' | 'SATELLITE'>(
    'HYBRID'
  );
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('cinematic');
  const [telemetry, setTelemetry] = useState<CameraTelemetry | null>(null);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteSegmentInfo | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const map3dHandleRef = useRef<CityMap3DHandle | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);

  const selectedIndex = useMemo(
    () => places.findIndex((p) => p.id === selectedPlaceId),
    [places, selectedPlaceId]
  );
  const selectedPlace =
    selectedIndex >= 0 ? places[selectedIndex] : null;

  const audioGuide = useAudioGuide();

  useEffect(() => {
    if (
      audioGuide.activePlaceId &&
      selectedPlaceId !== audioGuide.activePlaceId
    ) {
      audioGuide.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceId]);

  const loadCategory = useCallback(
    async (categoryId: TourCategoryId) => {
      if (!placesLib) return;
      setIsLoadingPlaces(true);
      setLoadError(null);
      setRouteInfo(null);
      setRouteError(null);
      setStreetViewOpen(false);
      setMobileInspectorOpen(false);
      try {
        const fetched = await fetchTourPlacesByCategory(placesLib, categoryId);
        setPlaces(fetched);
        if (fetched.length > 0) {
          setSelectedPlaceId(fetched[0].id);
          if (viewDimension === '3d') {
            window.setTimeout(() => {
              map3dHandleRef.current?.flyToPlace(fetched[0], cameraPreset);
            }, 350);
          }
          if (!fetched[0].detailsLoaded) {
            void enrichPlaceDetails(fetched[0]).then((enriched) => {
              setPlaces((prev) =>
                prev.map((item) => (item.id === enriched.id ? enriched : item))
              );
            });
          }
        } else {
          setSelectedPlaceId(null);
        }
      } catch {
        setLoadError(
          'Não foi possível carregar os pontos turísticos agora. Tente novamente.'
        );
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [placesLib, viewDimension, cameraPreset]
  );

  useEffect(() => {
    if (!placesLib) return;
    void loadCategory(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, activeCategory]);

  const handleSelectPlace = useCallback(
    async (place: TourPlace, stopAutoPlay = true, openMobile = false) => {
      if (stopAutoPlay) {
        setIsAutoPlaying(false);
      }
      setSelectedPlaceId(place.id);
      if (openMobile) {
        setMobileInspectorOpen(true);
      }
      setRouteInfo(null);
      setRouteError(null);

      if (viewDimension === '3d') {
        const heading =
          ((places.findIndex((p) => p.id === place.id) * 47 + 25) % 360);
        map3dHandleRef.current?.flyToPlace(place, cameraPreset, heading);
      }

      if (!place.detailsLoaded) {
        const enriched = await enrichPlaceDetails(place);
        setPlaces((prev) =>
          prev.map((item) => (item.id === enriched.id ? enriched : item))
        );
      }
    },
    [viewDimension, cameraPreset, places]
  );

  const handleAddSearchPlace = useCallback(
    async (searchedPlace: TourPlace) => {
      setIsAutoPlaying(false);
      setPlaces((prev) => {
        const exists = prev.some((p) => p.id === searchedPlace.id);
        return exists ? prev : [searchedPlace, ...prev];
      });
      setSelectedPlaceId(searchedPlace.id);
      setMobileInspectorOpen(true);
      setRouteInfo(null);
      setRouteError(null);

      if (viewDimension === '3d') {
        map3dHandleRef.current?.flyToPlace(searchedPlace, cameraPreset, 30);
      }

      const enriched = await enrichPlaceDetails(searchedPlace);
      setPlaces((prev) =>
        prev.map((item) => (item.id === enriched.id ? enriched : item))
      );
    },
    [viewDimension, cameraPreset]
  );

  const handlePrevStop = useCallback(() => {
    if (places.length === 0) return;
    const prevIdx =
      selectedIndex <= 0 ? places.length - 1 : selectedIndex - 1;
    void handleSelectPlace(places[prevIdx], true);
  }, [places, selectedIndex, handleSelectPlace]);

  const handleNextStop = useCallback(
    (fromAutoPlay = false) => {
      if (places.length === 0) return;
      const nextIdx =
        selectedIndex < 0 || selectedIndex >= places.length - 1
          ? 0
          : selectedIndex + 1;
      void handleSelectPlace(places[nextIdx], !fromAutoPlay);
    },
    [places, selectedIndex, handleSelectPlace]
  );

  // Guided tour automatic progression
  useEffect(() => {
    if (autoPlayTimerRef.current) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (!isAutoPlaying || places.length === 0) return;

    autoPlayTimerRef.current = window.setTimeout(() => {
      handleNextStop(true);
    }, 6500);

    return () => {
      if (autoPlayTimerRef.current) {
        window.clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlaying, selectedIndex, places.length, handleNextStop]);

  const handleChangeCameraPreset = useCallback(
    (preset: CameraPreset) => {
      setCameraPreset(preset);
      if (selectedPlace && viewDimension === '3d') {
        map3dHandleRef.current?.flyToPlace(selectedPlace, preset);
      }
    },
    [selectedPlace, viewDimension]
  );

  const handleOrbitPlace = useCallback(() => {
    if (!selectedPlace || viewDimension !== '3d') return;
    setIsAutoPlaying(false);
    map3dHandleRef.current?.orbitPlace(selectedPlace, cameraPreset);
  }, [selectedPlace, viewDimension, cameraPreset]);

  const handleComputeRoute = useCallback(async () => {
    if (!routesLib || !selectedPlace || places.length < 2) return;
    const originIdx =
      selectedIndex > 0 ? selectedIndex - 1 : places.length - 1;
    const origin = places[originIdx];
    if (!origin || origin.id === selectedPlace.id) return;

    setIsComputingRoute(true);
    setRouteError(null);
    try {
      const segment = await compute3DRouteSegment(
        routesLib,
        origin,
        selectedPlace
      );
      if (segment) {
        setRouteInfo(segment);
        setStreetViewOpen(false);
      } else {
        setRouteError('Não foi possível calcular o trajeto entre os pontos.');
      }
    } catch {
      setRouteError('Não foi possível calcular a rota. Tente novamente.');
    } finally {
      setIsComputingRoute(false);
    }
  }, [routesLib, selectedPlace, places, selectedIndex]);

  const initialCenter = places[0]?.location ?? null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0E1114]">
      {/* Base Layer: 3D Map, 2D Fallback, or Initializing Backdrop */}
      {initialCenter ? (
        viewDimension === '3d' && canUse3D ? (
          <CityMap3D
            ref={map3dHandleRef}
            initialCenter={initialCenter}
            places={places}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={(p) => void handleSelectPlace(p, true, true)}
            mapStyleMode={mapStyleMode}
            routeInfo={routeInfo}
            onCameraTelemetry={setTelemetry}
            onMapError={() => {
              setCanUse3D(false);
              setViewDimension('2d');
            }}
          />
        ) : (
          <CityMap2DFallback
            initialCenter={initialCenter}
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={(p) => void handleSelectPlace(p, true, true)}
            routeInfo={routeInfo}
            mapStyleMode={mapStyleMode}
            streetViewOpen={streetViewOpen}
            onCloseStreetView={() => setStreetViewOpen(false)}
          />
        )
      ) : (
        <div className="relative flex h-full w-full items-center justify-center">
          <img
            src={BH_AERIAL_FALLBACK_IMAGE}
            alt="Vista aérea de Belo Horizonte ao pôr do sol"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1114] via-[#0E1114]/45 to-[#0E1114]/65" />
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-xl border border-white/12 bg-[#0E1114]/82 px-6 py-5 text-center backdrop-blur-md">
            {loadError ? (
              <>
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <p className="max-w-xs text-sm text-slate-200">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadCategory(activeCategory)}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                >
                  Recarregar pontos turísticos
                </button>
              </>
            ) : (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                <p className="font-display text-base font-semibold text-white">
                  Preparando o voo 3D sobre Belo Horizonte
                </p>
                <p className="text-xs text-slate-300">
                  Carregando pontos turísticos e relevo fotorrealista...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* WebGL2 Unavailable Notice (Non-blocking) */}
      {!canUse3D && !webglNoticeDismissed && initialCenter && (
        <div className="pointer-events-auto absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-amber-400/30 bg-[#0E1114]/90 px-4 py-2 text-xs text-amber-200 shadow-lg backdrop-blur-md">
          <Compass className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Relevo 3D requer aceleração WebGL2 por hardware. Exibindo mapa aéreo e Street View 360°.
          </span>
          <button
            type="button"
            onClick={() => setWebglNoticeDismissed(true)}
            className="font-medium text-white underline hover:text-amber-200"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Semantic HUD Overlay */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left Panel or Collapsed Trigger */}
          <div>
            {panelsVisible ? (
              <>
                <div className={mobileInspectorOpen && selectedPlace ? 'hidden md:block' : 'block'}>
                  <TourSidebar
                    isOpen={panelsVisible}
                    onCollapse={() => setPanelsVisible(false)}
                    activeCategory={activeCategory}
                    onSelectCategory={(cat) => {
                      setIsAutoPlaying(false);
                      setActiveCategory(cat);
                    }}
                    places={places}
                    selectedPlaceId={selectedPlaceId}
                    onSelectPlace={(p) => void handleSelectPlace(p, true, true)}
                    onAddSearchPlace={(p) => void handleAddSearchPlace(p)}
                    isLoading={isLoadingPlaces}
                    errorMessage={loadError}
                    onRetry={() => void loadCategory(activeCategory)}
                    hostName={hostProfile.organizationName}
                    onOpenHostIntro={() => setHostIntroOpen(true)}
                  />
                </div>
                {mobileInspectorOpen && selectedPlace && (
                  <div className="md:hidden">
                    <PlaceInspectorCard
                      place={selectedPlace}
                      stopNumber={selectedIndex >= 0 ? selectedIndex + 1 : null}
                      onClose={() => setMobileInspectorOpen(false)}
                      onOrbitPlace={handleOrbitPlace}
                      onComputeRoute={() => void handleComputeRoute()}
                      isComputingRoute={isComputingRoute}
                      routeInfo={routeInfo}
                      routeError={routeError}
                      canComputeRoute={places.length > 1}
                      is3DMode={viewDimension === '3d' && canUse3D}
                      streetViewOpen={streetViewOpen}
                      onToggleStreetView={() => {
                        setIsAutoPlaying(false);
                        setStreetViewOpen((prev) => !prev);
                      }}
                      audioGuide={audioGuide}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanelsVisible(true)}
                  className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/12 bg-[#0E1114]/86 px-4 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-colors hover:bg-[#171C22]"
                >
                  <Compass className="h-4 w-4 text-sky-400" />
                  <span className="font-display">Belo Horizonte 3D</span>
                </button>

                {audioGuide.status !== 'idle' && (
                  <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#0E1114]/88 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur-md">
                    <Volume2
                      className="h-3.5 w-3.5 text-sky-400"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] text-sky-300 tabular-nums">
                      {audioGuide.currentSentenceIndex + 1}/
                      {audioGuide.totalSentences}
                    </span>
                    <button
                      type="button"
                      onClick={
                        audioGuide.status === 'playing'
                          ? audioGuide.pause
                          : audioGuide.resume
                      }
                      aria-label={
                        audioGuide.status === 'playing'
                          ? 'Pausar narração'
                          : 'Continuar narração'
                      }
                      className="rounded p-1 text-white hover:bg-white/10"
                    >
                      {audioGuide.status === 'playing' ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={audioGuide.stop}
                      aria-label="Parar narração"
                      className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Inspector Card (Desktop & Tablet) */}
          {panelsVisible && selectedPlace && (
            <div className="hidden md:block">
              <PlaceInspectorCard
                place={selectedPlace}
                stopNumber={selectedIndex >= 0 ? selectedIndex + 1 : null}
                onClose={() => setSelectedPlaceId(null)}
                onOrbitPlace={handleOrbitPlace}
                onComputeRoute={() => void handleComputeRoute()}
                isComputingRoute={isComputingRoute}
                routeInfo={routeInfo}
                routeError={routeError}
                canComputeRoute={places.length > 1}
                is3DMode={viewDimension === '3d' && canUse3D}
                streetViewOpen={streetViewOpen}
                onToggleStreetView={() => {
                  setIsAutoPlaying(false);
                  setStreetViewOpen((prev) => !prev);
                }}
                audioGuide={audioGuide}
              />
            </div>
          )}
        </div>

        {/* Bottom Dock */}
        <div className="flex justify-center">
          <TourControlDock
            currentIndex={selectedIndex}
            totalStops={places.length}
            currentPlaceName={selectedPlace?.displayName ?? null}
            isAutoPlaying={isAutoPlaying}
            onToggleAutoPlay={() => setIsAutoPlaying((prev) => !prev)}
            onPrevStop={handlePrevStop}
            onNextStop={() => handleNextStop(false)}
            cameraPreset={cameraPreset}
            onChangeCameraPreset={handleChangeCameraPreset}
            mapStyleMode={mapStyleMode}
            onToggleMapStyleMode={() =>
              setMapStyleMode((prev) =>
                prev === 'HYBRID' ? 'SATELLITE' : 'HYBRID'
              )
            }
            viewDimension={viewDimension}
            onToggleViewDimension={() => {
              setStreetViewOpen(false);
              setViewDimension((prev) => (prev === '3d' ? '2d' : '3d'));
            }}
            webglSupported={canUse3D}
            streetViewOpen={streetViewOpen}
            onToggleStreetView={() => {
              setIsAutoPlaying(false);
              setStreetViewOpen((prev) => !prev);
            }}
            hasSelectedPlace={Boolean(selectedPlace)}
            panelsVisible={panelsVisible}
            onTogglePanels={() => setPanelsVisible((prev) => !prev)}
            telemetry={telemetry}
          />
        </div>
      </div>

      <TransportHostCard
        isOpen={hostIntroOpen}
        profile={hostProfile}
        onSaveProfile={handleSaveHostProfile}
        onResetProfile={handleResetHostProfile}
        onClose={() => setHostIntroOpen(false)}
      />
    </div>
  );
};

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const hardware3DSupported = useMemo(() => detectHardware3DSupport(), []);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const libraries = useMemo(
    () =>
      hardware3DSupported
        ? ['maps3d', 'places', 'marker', 'routes', 'streetView']
        : ['places', 'marker', 'routes', 'streetView'],
    [hardware3DSupported]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0E1114]">
      {quotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {!API_KEY ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-xl border border-white/12 bg-white/5 p-6">
            <h1 className="font-display text-lg font-semibold text-white">
              Chave da Google Maps Platform não configurada
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Configure a variável de ambiente{' '}
              <code className="font-mono text-sky-300">
                VITE_GOOGLE_MAPS_API_KEY
              </code>{' '}
              para carregar o passeio 3D por Belo Horizonte.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          <APIProvider
            apiKey={API_KEY}
            version="beta"
            language="pt-BR"
            region="BR"
            libraries={libraries}
          >
            <TourExperience hardware3DSupported={hardware3DSupported} />
          </APIProvider>
        </div>
      )}
    </div>
  );
}
