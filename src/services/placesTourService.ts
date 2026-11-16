import type {
  OpeningPeriodSummary,
  RouteSegmentInfo,
  TourCategory,
  TourCategoryId,
  TourPlace,
  TravelTips,
} from '../types/tour';

export const TOUR_CATEGORIES: TourCategory[] = [
  {
    id: 'highlights',
    label: 'Destaques',
    query:
      'principais pontos turísticos e cartões postais de Belo Horizonte Minas Gerais',
  },
  {
    id: 'architecture',
    label: 'Cultura',
    query:
      'museus arquitetura Oscar Niemeyer Circuito Liberdade Pampulha Belo Horizonte',
  },
  {
    id: 'nature',
    label: 'Natureza',
    query: 'parques mirantes lagoas serra natureza Belo Horizonte Minas Gerais',
  },
  {
    id: 'gastronomy',
    label: 'Sabores',
    query:
      'Mercado Central Mercado Novo gastronomia mineira Belo Horizonte Minas Gerais',
  },
  {
    id: 'gastronomia',
    label: 'Gastronomia',
    query:
      'restaurantes icônicos comida mineira e cafeterias famosas Belo Horizonte Minas Gerais',
  },
  {
    id: 'historic_cities',
    label: 'Cidades Históricas',
    query: 'cidades históricas mais visitadas de Minas Gerais',
  },
];

const HISTORIC_CITIES_QUERIES = [
  'Ouro Preto, Minas Gerais, Brasil',
  'Tiradentes, Minas Gerais, Brasil',
  'Mariana, Minas Gerais, Brasil',
  'Diamantina, Minas Gerais, Brasil',
  'São João del-Rei, Minas Gerais, Brasil',
  'Congonhas, Minas Gerais, Brasil',
  'Sabará, Minas Gerais, Brasil',
  'Serro, Minas Gerais, Brasil',
];

export const BH_AERIAL_FALLBACK_IMAGE =
  '/src/assets/images/bh_aerial_backdrop_1794831956263.jpg';

const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export function checkQuotaError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as {
    status?: number | string;
    code?: string;
    message?: string;
  };
  const msg = String(anyErr?.message ?? err).toLowerCase();
  const status = anyErr?.status;
  const code = String(anyErr?.code ?? '').toUpperCase();

  if (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT' ||
    code === 'RESOURCE_EXHAUSTED' ||
    code === 'OVER_QUERY_LIMIT' ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('over_query_limit') ||
    msg.includes('overquotamaperror')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

export function mapGooglePlaceToTourPlace(
  place: google.maps.places.Place,
  detailsLoaded = false
): TourPlace | null {
  if (!place.location) return null;
  const loc = place.location.toJSON();
  const photoUrl = place.photos?.[0]
    ? place.photos[0].getURI({maxWidth: 720, maxHeight: 450})
    : null;

  const openingPeriods: OpeningPeriodSummary[] = (
    place.regularOpeningHours?.periods ?? []
  ).map((period) => ({
    openDay: period.open.day,
    openHour: period.open.hour,
    openMinute: period.open.minute,
    closeDay: period.close ? period.close.day : null,
    closeHour: period.close ? period.close.hour : null,
    closeMinute: period.close ? period.close.minute : null,
  }));

  return {
    id: place.id,
    displayName: place.displayName || 'Local em Belo Horizonte',
    formattedAddress: place.formattedAddress || 'Belo Horizonte, MG',
    location: {
      lat: loc.lat,
      lng: loc.lng,
    },
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    primaryType: place.primaryType ?? null,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    types: place.types ?? [],
    editorialSummary: place.editorialSummary ?? null,
    photoUrl,
    googleMapsURI: place.googleMapsURI ?? null,
    isOpenNow: null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    openingPeriods,
    detailsLoaded,
    rawPlace: place,
  };
}

const categoryCache: Partial<Record<TourCategoryId, TourPlace[]>> = {};
let featuredFeiraHippieCache: TourPlace | null = null;

async function fetchFeiraHippiePlace(
  placesLib: google.maps.PlacesLibrary
): Promise<TourPlace | null> {
  if (featuredFeiraHippieCache) {
    return featuredFeiraHippieCache;
  }

  try {
    const request: google.maps.places.SearchByTextRequest & {
      internalUsageAttributionIds?: string[];
    } = {
      textQuery: 'Feira Hippie Avenida Afonso Pena Belo Horizonte Minas Gerais',
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
      language: 'pt-BR',
      region: 'br',
      maxResultCount: 1,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    };

    const {places} = await placesLib.Place.searchByText(request);
    const first = places?.[0];
    if (!first) return null;

    const mapped = mapGooglePlaceToTourPlace(first, false);
    if (mapped) {
      featuredFeiraHippieCache = mapped;
    }
    return mapped;
  } catch (err) {
    checkQuotaError(err);
    return null;
  }
}

async function fetchHistoricCitiesPlaces(
  placesLib: google.maps.PlacesLibrary
): Promise<TourPlace[]> {
  const fields = [
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
  ];

  const results = await Promise.all(
    HISTORIC_CITIES_QUERIES.map(async (textQuery) => {
      try {
        const request: google.maps.places.SearchByTextRequest & {
          internalUsageAttributionIds?: string[];
        } = {
          textQuery,
          fields,
          language: 'pt-BR',
          region: 'br',
          maxResultCount: 1,
          internalUsageAttributionIds: [ATTRIBUTION_ID],
        };
        const {places} = await placesLib.Place.searchByText(request);
        const first = places?.[0];
        return first ? mapGooglePlaceToTourPlace(first, false) : null;
      } catch (err) {
        if (checkQuotaError(err)) {
          throw err;
        }
        return null;
      }
    })
  );

  const seen = new Set<string>();
  return results.filter((p): p is TourPlace => {
    if (!p || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function fetchTourPlacesByCategory(
  placesLib: google.maps.PlacesLibrary,
  categoryId: TourCategoryId
): Promise<TourPlace[]> {
  const cached = categoryCache[categoryId];
  if (cached && cached.length > 0) {
    return cached;
  }

  const category =
    TOUR_CATEGORIES.find((c) => c.id === categoryId) ?? TOUR_CATEGORIES[0];

  try {
    if (categoryId === 'historic_cities') {
      const cities = await fetchHistoricCitiesPlaces(placesLib);
      if (cities.length > 0) {
        categoryCache[categoryId] = cities;
      }
      return cities;
    }

    const request: google.maps.places.SearchByTextRequest & {
      internalUsageAttributionIds?: string[];
    } = {
      textQuery: category.query,
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
      language: 'pt-BR',
      region: 'br',
      maxResultCount: 10,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    };

    const [{places}, feiraHippie] = await Promise.all([
      placesLib.Place.searchByText(request),
      categoryId === 'highlights'
        ? fetchFeiraHippiePlace(placesLib)
        : Promise.resolve(null),
    ]);

    const mapped = (places ?? [])
      .map((p) => mapGooglePlaceToTourPlace(p, false))
      .filter((p): p is TourPlace => p !== null);

    if (feiraHippie) {
      const existingIndex = mapped.findIndex((p) => p.id === feiraHippie.id);
      if (existingIndex === -1) {
        const insertIndex = Math.min(1, mapped.length);
        mapped.splice(insertIndex, 0, feiraHippie);
      }
    }

    if (mapped.length > 0) {
      categoryCache[categoryId] = mapped;
    }
    return mapped;
  } catch (err) {
    checkQuotaError(err);
    throw err;
  }
}

export async function enrichPlaceDetails(
  tourPlace: TourPlace
): Promise<TourPlace> {
  if (tourPlace.detailsLoaded) return tourPlace;

  try {
    await tourPlace.rawPlace.fetchFields({
      fields: [
        'formattedAddress',
        'rating',
        'userRatingCount',
        'primaryType',
        'primaryTypeDisplayName',
        'types',
        'editorialSummary',
        'regularOpeningHours',
        'photos',
        'googleMapsURI',
      ],
    });

    const isOpen = await tourPlace.rawPlace
      .isOpen()
      .catch(() => null as boolean | null);

    const updated = mapGooglePlaceToTourPlace(tourPlace.rawPlace, true);
    if (!updated) return tourPlace;

    return {
      ...updated,
      isOpenNow: isOpen ?? null,
    };
  } catch (err) {
    checkQuotaError(err);
    return {
      ...tourPlace,
      detailsLoaded: true,
    };
  }
}

export async function compute3DRouteSegment(
  routesLib: google.maps.RoutesLibrary,
  origin: TourPlace,
  destination: TourPlace
): Promise<RouteSegmentInfo | null> {
  try {
    const response = await routesLib.Route.computeRoutes({
      origin: origin.location,
      destination: destination.location,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
      language: 'pt-BR',
      region: 'br',
    });

    const route = response.routes?.[0];
    if (!route || !route.path || route.path.length === 0) return null;

    const path: google.maps.LatLngLiteral[] = route.path.map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
    }));

    const distMeters = route.distanceMeters ?? 0;
    const durMillis = route.durationMillis ?? 0;
    const distanceText =
      route.localizedValues?.distance ||
      (distMeters >= 1000
        ? `${(distMeters / 1000).toFixed(1).replace('.', ',')} km`
        : `${Math.round(distMeters)} m`);
    const durationMin = Math.max(1, Math.round(durMillis / 60000));
    const durationText =
      route.localizedValues?.duration || `${durationMin} min`;

    return {
      fromName: origin.displayName,
      toName: destination.displayName,
      distanceText,
      durationText,
      path,
    };
  } catch (err) {
    checkQuotaError(err);
    throw err;
  }
}

const DAY_NAMES_PLURAL_PT = [
  'Aos domingos',
  'Às segundas-feiras',
  'Às terças-feiras',
  'Às quartas-feiras',
  'Às quintas-feiras',
  'Às sextas-feiras',
  'Aos sábados',
];

function formatMinutesPt(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const hh = String(h).padStart(2, '0');
  return m > 0 ? `${hh}h${String(m).padStart(2, '0')}` : `${hh}h`;
}

function clampWindow(
  startMin: number,
  endMin: number,
  openMin: number,
  closeMin: number
): [number, number] | null {
  const s = Math.max(startMin, openMin);
  const e = Math.min(endMin, closeMin);
  if (e - s < 45) return null;
  return [s, e];
}

export function deriveTravelTips(place: TourPlace): TravelTips {
  const allTypes = new Set(
    [place.primaryType, ...(place.types ?? [])]
      .filter((t): t is string => Boolean(t))
      .map((t) => t.toLowerCase())
  );

  const isCafe =
    allTypes.has('cafe') ||
    allTypes.has('coffee_shop') ||
    allTypes.has('bakery') ||
    allTypes.has('tea_house');
  const isBar =
    allTypes.has('bar') ||
    allTypes.has('pub') ||
    allTypes.has('night_club') ||
    allTypes.has('wine_bar') ||
    allTypes.has('brewery');
  const isRestaurant =
    allTypes.has('restaurant') ||
    allTypes.has('brazilian_restaurant') ||
    allTypes.has('steak_house') ||
    allTypes.has('food_court') ||
    allTypes.has('bistro') ||
    allTypes.has('meal_takeaway');
  const isMarket =
    allTypes.has('market') ||
    allTypes.has('flea_market') ||
    allTypes.has('farmers_market') ||
    allTypes.has('shopping_mall') ||
    allTypes.has('department_store');
  const isCulture =
    allTypes.has('museum') ||
    allTypes.has('art_gallery') ||
    allTypes.has('cultural_center') ||
    allTypes.has('theater') ||
    allTypes.has('performing_arts_theater') ||
    allTypes.has('church') ||
    allTypes.has('place_of_worship') ||
    allTypes.has('historical_landmark') ||
    allTypes.has('library');
  const isHistoricCity =
    allTypes.has('locality') ||
    allTypes.has('administrative_area_level_2') ||
    allTypes.has('administrative_area_level_3');
  const isOutdoor =
    allTypes.has('park') ||
    allTypes.has('national_park') ||
    allTypes.has('natural_feature') ||
    allTypes.has('scenic_spot') ||
    allTypes.has('plaza') ||
    allTypes.has('botanical_garden') ||
    allTypes.has('zoo') ||
    allTypes.has('stadium') ||
    allTypes.has('sports_complex') ||
    allTypes.has('amusement_park') ||
    (!isCafe &&
      !isBar &&
      !isRestaurant &&
      !isMarket &&
      !isCulture &&
      !isHistoricCity &&
      allTypes.has('tourist_attraction'));

  const periods = place.openingPeriods ?? [];
  const isAlwaysOpen =
    periods.length === 1 && periods[0].closeHour === null;
  const openDays = Array.from(new Set(periods.map((p) => p.openDay)));

  let peakHours: string;
  let quietWindow: string;

  if (periods.length > 0 && !isAlwaysOpen) {
    const weekendPeriod =
      periods.find((p) => p.openDay === 0 || p.openDay === 6) ?? periods[0];
    const openMin =
      weekendPeriod.openHour * 60 + weekendPeriod.openMinute;
    const rawCloseMin =
      weekendPeriod.closeHour !== null
        ? weekendPeriod.closeHour * 60 + (weekendPeriod.closeMinute ?? 0)
        : openMin + 480;
    const closeMin =
      rawCloseMin <= openMin ? rawCloseMin + 1440 : rawCloseMin;

    if (openDays.length === 1) {
      const dayLabel =
        DAY_NAMES_PLURAL_PT[openDays[0]] || 'Nos dias de funcionamento';
      const rushStart = Math.min(openMin + 90, Math.max(openMin, closeMin - 90));
      const rushEnd = Math.min(closeMin - 30, rushStart + 180);
      peakHours = `${dayLabel}, entre ${formatMinutesPt(rushStart)} e ${formatMinutesPt(rushEnd)} (funcionamento de ${formatMinutesPt(openMin)} às ${formatMinutesPt(closeMin)})`;
      quietWindow = `Logo na abertura, a partir das ${formatMinutesPt(openMin)}, para circular com mais tranquilidade`;
    } else {
      const hasWeekend = openDays.some((d) => d === 0 || d === 6);
      const dayPrefix = hasWeekend ? 'Sábados e domingos' : 'Dias de maior movimento';

      if (isCafe) {
        const morning = clampWindow(9 * 60, 11 * 60, openMin, closeMin);
        const afternoon = clampWindow(16 * 60, 18 * 60 + 30, openMin, closeMin);
        const windows = [morning, afternoon]
          .filter((w): w is [number, number] => w !== null)
          .map((w) => `${formatMinutesPt(w[0])}–${formatMinutesPt(w[1])}`);
        peakHours =
          windows.length > 0
            ? `${dayPrefix}, das ${windows.join(' e ')}`
            : `${dayPrefix}, no meio do expediente (${formatMinutesPt(openMin)}–${formatMinutesPt(closeMin)})`;
        quietWindow = `Logo após abrir (${formatMinutesPt(openMin)}) ou início da tarde em dias úteis`;
      } else if (isBar) {
        const night = clampWindow(19 * 60, 22 * 60 + 30, openMin, closeMin);
        peakHours = night
          ? `Sextas e sábados, ${formatMinutesPt(night[0])}–${formatMinutesPt(night[1])}`
          : `Fins de semana, entre ${formatMinutesPt(Math.max(openMin, closeMin - 240))} e ${formatMinutesPt(closeMin - 30)}`;
        quietWindow = `Na abertura (${formatMinutesPt(openMin)}) ou de terça a quinta`;
      } else if (isRestaurant) {
        const lunch = clampWindow(12 * 60, 14 * 60 + 15, openMin, closeMin);
        const dinner = clampWindow(19 * 60 + 30, 21 * 60 + 45, openMin, closeMin);
        const windows = [lunch, dinner]
          .filter((w): w is [number, number] => w !== null)
          .map((w) => `${formatMinutesPt(w[0])}–${formatMinutesPt(w[1])}`);
        peakHours =
          windows.length > 0
            ? `${dayPrefix}, ${windows.join(' e ')}`
            : `${dayPrefix}, dentro do horário de ${formatMinutesPt(openMin)} às ${formatMinutesPt(closeMin)}`;
        quietWindow =
          lunch && openMin < 12 * 60
            ? `Antes das 12h ou após as 14h30 em dias úteis`
            : `Logo na abertura (${formatMinutesPt(openMin)})`;
      } else if (isMarket) {
        const rush = clampWindow(9 * 60 + 30, 13 * 60, openMin, closeMin);
        peakHours = rush
          ? `Sábados e domingos, ${formatMinutesPt(rush[0])}–${formatMinutesPt(rush[1])}`
          : `${dayPrefix}, período da manhã`;
        quietWindow = `Dias úteis entre ${formatMinutesPt(openMin)} e ${formatMinutesPt(Math.min(closeMin, openMin + 150))}`;
      } else if (isCulture) {
        const rush = clampWindow(14 * 60, 17 * 60, openMin, closeMin);
        peakHours = rush
          ? `${dayPrefix}, ${formatMinutesPt(rush[0])}–${formatMinutesPt(rush[1])}`
          : `${dayPrefix}, período da tarde`;
        quietWindow = `Manhãs de terça a sexta-feira, a partir das ${formatMinutesPt(openMin)}`;
      } else {
        const morning = clampWindow(9 * 60 + 30, 12 * 60, openMin, closeMin);
        const sunset = clampWindow(16 * 60, 18 * 60 + 30, openMin, closeMin);
        const windows = [morning, sunset]
          .filter((w): w is [number, number] => w !== null)
          .map((w) => `${formatMinutesPt(w[0])}–${formatMinutesPt(w[1])}`);
        peakHours =
          windows.length > 0
            ? `${dayPrefix}, ${windows.join(' e ')}`
            : `${dayPrefix}, das ${formatMinutesPt(openMin)} às ${formatMinutesPt(closeMin)}`;
        quietWindow = `Início da manhã (${formatMinutesPt(openMin)}) em dias úteis`;
      }
    }
  } else if (isCafe) {
    peakHours = 'Fins de semana, 09h30–11h30 e 16h–18h30';
    quietWindow = 'Início da manhã ou começo da tarde em dias úteis';
  } else if (isBar) {
    peakHours = 'Quinta a sábado, 19h–22h30';
    quietWindow = 'Início da noite (18h–19h) ou terça e quarta-feira';
  } else if (isRestaurant) {
    peakHours = 'Sábados e domingos no almoço (12h–14h30) e jantar (19h30–21h30)';
    quietWindow = 'Dias úteis antes das 12h ou entre 14h30 e 18h';
  } else if (isMarket) {
    peakHours = 'Sábados e domingos pela manhã (09h30–13h)';
    quietWindow = 'Manhãs de terça a sexta-feira';
  } else if (isCulture) {
    peakHours = 'Sábados, domingos e feriados à tarde (14h–17h)';
    quietWindow = 'Dias úteis pela manhã logo após a abertura';
  } else if (isHistoricCity) {
    peakHours =
      'Fins de semana prolongados, feriados nacionais e férias escolares (sexta a domingo)';
    quietWindow =
      'De terça a quinta-feira em baixa temporada, ideal para caminhar pelas ruas históricas com calma';
  } else {
    peakHours = isAlwaysOpen
      ? 'Acesso 24h; maior movimento aos fins de semana (09h–12h e 16h30–19h)'
      : 'Fins de semana e fim de tarde (09h30–12h e 16h30–18h30)';
    quietWindow = 'Manhãs de segunda a sexta-feira (07h30–10h30)';
  }

  let bestSeason: string;
  if (isHistoricCity) {
    bestSeason =
      'Maio a setembro (estação seca em Minas Gerais): céu aberto, clima ameno e ruas mais secas para explorar ladeiras, igrejas e mirantes históricos.';
  } else if (isOutdoor) {
    bestSeason =
      'Maio a setembro (estação seca em BH): céu limpo, clima ameno e melhor visibilidade. Entre outubro e março, dê preferência ao período da manhã.';
  } else if (isMarket || isCafe || isRestaurant || isBar || isCulture) {
    bestSeason =
      'O ano inteiro: ideal na estação seca (mai–set) e excelente refúgio nos dias quentes ou com chuvas de verão (out–mar).';
  } else {
    bestSeason =
      'Maio a setembro (estação seca e temperaturas amenas) garante dias mais estáveis para passeios pela cidade.';
  }

  const count = place.userRatingCount ?? 0;
  const popularityNote =
    count >= 15000
      ? `Atração de alta procura (${count.toLocaleString('pt-BR')} avaliações)`
      : count >= 2500
        ? `Bastante visitado aos fins de semana (${count.toLocaleString('pt-BR')} avaliações)`
        : null;

  return {
    peakHours,
    quietWindow,
    bestSeason,
    popularityNote,
  };
}

export function buildPlaceNarrationSentences(
  place: TourPlace,
  stopNumber: number | null
): string[] {
  const tips = deriveTravelTips(place);
  const sentences: string[] = [];

  const isHistoricCity =
    place.primaryType === 'locality' ||
    Boolean(place.types?.includes('locality'));
  const regionLabel = place.formattedAddress
    .toLowerCase()
    .includes('belo horizonte')
    ? 'em Belo Horizonte'
    : 'em Minas Gerais';

  const introPrefix =
    stopNumber !== null ? `Parada ${stopNumber}: ` : '';
  if (isHistoricCity) {
    sentences.push(
      `${introPrefix}${place.displayName}, cidade histórica de Minas Gerais.`
    );
  } else {
    const typeDesc = place.primaryTypeDisplayName
      ? `, ${place.primaryTypeDisplayName.toLowerCase()} ${regionLabel}`
      : ` ${regionLabel}`;
    sentences.push(`${introPrefix}${place.displayName}${typeDesc}.`);
  }

  if (place.editorialSummary) {
    const trimmed = place.editorialSummary.trim();
    sentences.push(trimmed.endsWith('.') ? trimmed : `${trimmed}.`);
  }

  sentences.push(`Localizado em ${place.formattedAddress}.`);

  if (place.rating != null) {
    const ratingStr = place.rating.toFixed(1).replace('.', ',');
    const countPart =
      place.userRatingCount != null
        ? `, com ${place.userRatingCount.toLocaleString('pt-BR')} avaliações registradas`
        : '';
    sentences.push(
      `Este ponto turístico conta com nota ${ratingStr} de 5 no Google${countPart}.`
    );
  }

  if (place.isOpenNow !== null && place.isOpenNow !== undefined) {
    sentences.push(
      place.isOpenNow
        ? 'No momento, o local encontra-se aberto para visitação.'
        : 'No momento, o local encontra-se fechado.'
    );
  }

  sentences.push(
    `Dica de viagem: os horários de pico costumam ser ${tips.peakHours}. Para aproveitar com mais calma, prefira ${tips.quietWindow.charAt(0).toLowerCase()}${tips.quietWindow.slice(1)}.`
  );

  sentences.push(`Melhor época para visitar: ${tips.bestSeason}`);

  return sentences;
}
