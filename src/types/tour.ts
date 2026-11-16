export type TourCategoryId =
  | 'highlights'
  | 'architecture'
  | 'nature'
  | 'gastronomy'
  | 'gastronomia'
  | 'historic_cities';

export interface TourCategory {
  id: TourCategoryId;
  label: string;
  query: string;
}

export interface OpeningPeriodSummary {
  openDay: number;
  openHour: number;
  openMinute: number;
  closeDay: number | null;
  closeHour: number | null;
  closeMinute: number | null;
}

export interface TravelTips {
  peakHours: string;
  quietWindow: string;
  bestSeason: string;
  popularityNote: string | null;
}

export interface TourPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number | null;
  userRatingCount?: number | null;
  primaryType?: string | null;
  primaryTypeDisplayName?: string | null;
  types?: string[];
  editorialSummary?: string | null;
  photoUrl?: string | null;
  googleMapsURI?: string | null;
  isOpenNow?: boolean | null;
  weekdayDescriptions?: string[];
  openingPeriods?: OpeningPeriodSummary[];
  detailsLoaded: boolean;
  rawPlace: google.maps.places.Place;
}

export type CameraPreset = 'aerial' | 'cinematic' | 'close';

export interface CameraTelemetry {
  lat: number;
  lng: number;
  altitude: number;
  range: number;
  heading: number;
  tilt: number;
}

export interface RouteSegmentInfo {
  fromName: string;
  toName: string;
  distanceText: string;
  durationText: string;
  path: google.maps.LatLngLiteral[];
}

export interface TransportHostProfile {
  organizationName: string;
  driverName: string;
  serviceTagline: string;
  shortBio: string;
  tourPrompt: string;
}
