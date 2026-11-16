import {AltitudeMode, Pin, useMapsLibrary} from '@vis.gl/react-google-maps';
import {
  GestureHandling,
  Map3D,
  MapMode,
  Marker3D,
  Polyline3D,
  type Map3DCameraChangedEvent,
  type Map3DRef,
} from '@vis.gl/react-google-maps/3d';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import type {
  CameraPreset,
  CameraTelemetry,
  RouteSegmentInfo,
  TourPlace,
} from '../types/tour';

export interface CityMap3DHandle {
  flyToPlace: (
    place: TourPlace,
    preset: CameraPreset,
    headingOverride?: number
  ) => void;
  orbitPlace: (place: TourPlace, preset: CameraPreset) => void;
  stopAnimation: () => void;
}

interface CityMap3DProps {
  initialCenter: {lat: number; lng: number};
  places: TourPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: TourPlace) => void;
  mapStyleMode: 'HYBRID' | 'SATELLITE';
  routeInfo: RouteSegmentInfo | null;
  onCameraTelemetry: (telemetry: CameraTelemetry) => void;
  onAnimationEnd?: () => void;
  onMapError: () => void;
}

export function getPresetCameraParams(preset: CameraPreset): {
  range: number;
  tilt: number;
} {
  switch (preset) {
    case 'aerial':
      return {range: 1350, tilt: 54};
    case 'close':
      return {range: 360, tilt: 68};
    case 'cinematic':
    default:
      return {range: 640, tilt: 62};
  }
}

export const CityMap3D = forwardRef<CityMap3DHandle, CityMap3DProps>(
  (
    {
      initialCenter,
      places,
      selectedPlaceId,
      onSelectPlace,
      mapStyleMode,
      routeInfo,
      onCameraTelemetry,
      onAnimationEnd,
      onMapError,
    },
    ref
  ) => {
    useMapsLibrary('maps3d');
    useMapsLibrary('marker');

    const map3dRef = useRef<Map3DRef | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        flyToPlace: (
          place: TourPlace,
          preset: CameraPreset,
          headingOverride?: number
        ) => {
          const {range, tilt} = getPresetCameraParams(preset);
          const isCity =
            place.primaryType === 'locality' ||
            Boolean(place.types?.includes('locality'));
          const effectiveRange = isCity ? Math.round(range * 2.8) : range;
          map3dRef.current?.flyCameraTo({
            endCamera: {
              center: {
                lat: place.location.lat,
                lng: place.location.lng,
                altitude: isCity ? 80 : 25,
              },
              range: effectiveRange,
              tilt,
              heading: headingOverride ?? 28,
            },
            durationMillis: 2600,
          });
        },
        orbitPlace: (place: TourPlace, preset: CameraPreset) => {
          const {range, tilt} = getPresetCameraParams(preset);
          const isCity =
            place.primaryType === 'locality' ||
            Boolean(place.types?.includes('locality'));
          map3dRef.current?.flyCameraAround({
            camera: {
              center: {
                lat: place.location.lat,
                lng: place.location.lng,
                altitude: isCity ? 70 : 20,
              },
              range: isCity ? Math.max(range * 2.2, 1800) : Math.min(range, 720),
              tilt: Math.max(tilt, 60),
              heading: 0,
            },
            durationMillis: 16000,
            repeatCount: 1,
          });
        },
        stopAnimation: () => {
          map3dRef.current?.stopCameraAnimation();
        },
      }),
      []
    );

    const handleCameraChanged = useCallback(
      (ev: Map3DCameraChangedEvent) => {
        const {center, range, heading, tilt} = ev.detail;
        onCameraTelemetry({
          lat: center.lat,
          lng: center.lng,
          altitude: center.altitude ?? 0,
          range,
          heading,
          tilt,
        });
      },
      [onCameraTelemetry]
    );

    const routeCoordinates = routeInfo?.path.map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
      altitude: 8,
    }));

    return (
      <div className="h-full w-full">
        <Map3D
          ref={map3dRef}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          mode={
            mapStyleMode === 'HYBRID' ? MapMode.HYBRID : MapMode.SATELLITE
          }
          gestureHandling={GestureHandling.GREEDY}
          defaultCenter={{
            lat: initialCenter.lat,
            lng: initialCenter.lng,
            altitude: 40,
          }}
          defaultRange={1450}
          defaultHeading={28}
          defaultTilt={58}
          defaultRoll={0}
          onCameraChanged={handleCameraChanged}
          onAnimationEnd={() => onAnimationEnd?.()}
          onError={() => onMapError()}
          style={{width: '100%', height: '100%'}}
        >
          {places.map((place, index) => {
            const isSelected = place.id === selectedPlaceId;
            return (
              <Marker3D
                key={place.id}
                position={{
                  lat: place.location.lat,
                  lng: place.location.lng,
                  altitude: isSelected ? 65 : 42,
                }}
                altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
                extruded
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
              </Marker3D>
            );
          })}

          {routeCoordinates && routeCoordinates.length > 1 && (
            <Polyline3D
              coordinates={routeCoordinates}
              altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
              strokeColor="#38BDF8"
              strokeWidth={7}
              drawsOccludedSegments
              geodesic
            />
          )}
        </Map3D>
      </div>
    );
  }
);

CityMap3D.displayName = 'CityMap3D';
