import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {AlertCircle, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {checkQuotaError} from '../services/placesTourService';
import type {RouteSegmentInfo, TourPlace} from '../types/tour';

interface CityMap2DFallbackProps {
  initialCenter: {lat: number; lng: number};
  places: TourPlace[];
  selectedPlace: TourPlace | null;
  onSelectPlace: (place: TourPlace) => void;
  routeInfo: RouteSegmentInfo | null;
  mapStyleMode: 'HYBRID' | 'SATELLITE';
  streetViewOpen: boolean;
  onCloseStreetView: () => void;
}

const CameraPanSync: React.FC<{
  selectedPlace: TourPlace | null;
  mapStyleMode: 'HYBRID' | 'SATELLITE';
}> = ({selectedPlace, mapStyleMode}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapStyleMode === 'HYBRID' ? 'hybrid' : 'satellite');
  }, [map, mapStyleMode]);

  useEffect(() => {
    if (!map || !selectedPlace) return;
    const isCity =
      selectedPlace.primaryType === 'locality' ||
      Boolean(selectedPlace.types?.includes('locality'));
    map.panTo(selectedPlace.location);
    map.setZoom(isCity ? 13 : 16);
    map.setTilt(45);
  }, [map, selectedPlace]);

  return null;
};

const StreetViewOverlay: React.FC<{
  place: TourPlace;
  onClose: () => void;
}> = ({place, onClose}) => {
  const streetViewLib = useMapsLibrary('streetView');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    'loading'
  );

  useEffect(() => {
    if (!streetViewLib || !containerRef.current) return;

    let cancelled = false;
    setStatus('loading');

    const service = new streetViewLib.StreetViewService();
    service
      .getPanorama({
        location: place.location,
        radius: 220,
        preference: 'best' as google.maps.StreetViewPreference,
      })
      .then((response) => {
        if (cancelled || !containerRef.current) return;
        const panoId = response.data?.location?.pano;
        if (!panoId) {
          setStatus('unavailable');
          return;
        }

        if (!panoInstanceRef.current) {
          panoInstanceRef.current = new streetViewLib.StreetViewPanorama(
            containerRef.current,
            {
              pano: panoId,
              pov: {heading: 25, pitch: 5},
              zoom: 1,
              addressControl: false,
              linksControl: true,
              panControl: true,
              zoomControl: true,
              enableCloseButton: false,
              fullscreenControl: false,
              motionTracking: false,
              motionTrackingControl: false,
              showRoadLabels: true,
            }
          );
        } else {
          panoInstanceRef.current.setPano(panoId);
          panoInstanceRef.current.setPov({heading: 25, pitch: 5});
        }
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = String((err as {message?: string})?.message ?? err);
        if (!msg.includes('ZERO_RESULTS')) {
          checkQuotaError(err);
        }
        setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [streetViewLib, place.id, place.location]);

  useEffect(() => {
    return () => {
      panoInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-10 bg-[#0E1114]">
      <div ref={containerRef} className="h-full w-full" />

      {status === 'unavailable' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0E1114]/85 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-xl border border-white/12 bg-[#14191F] p-5 text-center shadow-2xl">
            <AlertCircle className="mx-auto h-6 w-6 text-amber-400" />
            <p className="font-display mt-2 text-base font-semibold text-white">
              Street View 360° indisponível neste ponto
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Não há imagens panorâmicas de rua exatamente nas coordenadas de{' '}
              {place.displayName}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              <X className="h-3.5 w-3.5" />
              Voltar ao mapa aéreo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CityMap2DFallback: React.FC<CityMap2DFallbackProps> = ({
  initialCenter,
  places,
  selectedPlace,
  onSelectPlace,
  routeInfo,
  mapStyleMode,
  streetViewOpen,
  onCloseStreetView,
}) => {
  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={initialCenter}
        defaultZoom={14}
        defaultTilt={45}
        defaultHeading={25}
        mapTypeId={mapStyleMode === 'HYBRID' ? 'hybrid' : 'satellite'}
        gestureHandling="greedy"
        disableDefaultUI
        style={{width: '100%', height: '100%'}}
      >
        <CameraPanSync
          selectedPlace={selectedPlace}
          mapStyleMode={mapStyleMode}
        />

        {places.map((place, index) => {
          const isSelected = place.id === selectedPlace?.id;
          return (
            <AdvancedMarker
              key={place.id}
              position={place.location}
              title={place.displayName}
              onClick={() => onSelectPlace(place)}
            >
              <Pin
                background={isSelected ? '#38BDF8' : '#0F172A'}
                borderColor={isSelected ? '#FFFFFF' : '#38BDF8'}
                glyphColor={isSelected ? '#090D16' : '#F8FAFC'}
                glyphText={String(index + 1)}
                scale={isSelected ? 1.25 : 0.95}
              />
            </AdvancedMarker>
          );
        })}

        {routeInfo && routeInfo.path.length > 1 && (
          <Polyline
            path={routeInfo.path}
            strokeColor="#38BDF8"
            strokeOpacity={0.9}
            strokeWeight={5}
            geodesic
          />
        )}
      </GoogleMap>

      {streetViewOpen && selectedPlace && (
        <StreetViewOverlay place={selectedPlace} onClose={onCloseStreetView} />
      )}
    </div>
  );
};
