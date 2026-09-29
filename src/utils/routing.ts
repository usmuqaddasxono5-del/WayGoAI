import { RouteDetail, RouteStep, TransitInfo } from '../types';

// Real-world OSRM routing client with fallback simulation
export async function fetchRealRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'walk' | 'drive' | 'transit',
  transitHint?: TransitInfo
): Promise<RouteDetail> {
  const osrmProfile = mode === 'walk' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        let durationMin = Math.round(route.duration / 60);

        if (mode === 'transit') {
          // Transit has waiting and stopping times
          durationMin = Math.round(durationMin * 1.35 + 4);
        }

        // Parse OSRM steps
        const osrmLegs = route.legs?.[0]?.steps || [];
        const steps: RouteStep[] = osrmLegs.map((step: any, index: number) => {
          const maneuver = step.maneuver || {};
          let instruction = formatStepInstruction(maneuver.type, maneuver.modifier, step.name, mode);
          let iconType: RouteStep['iconType'] = 'straight';

          if (maneuver.modifier?.includes('left')) iconType = 'turn-left';
          else if (maneuver.modifier?.includes('right')) iconType = 'turn-right';
          else if (maneuver.type === 'roundabout') iconType = 'roundabout';
          else if (maneuver.type === 'arrive') iconType = 'arrive';

          const distM = Math.round(step.distance);
          const distStr = distM > 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
          const durSec = Math.round(step.duration);
          const durStr = durSec > 60 ? `${Math.round(durSec / 60)} daq` : `${durSec} sek`;

          return {
            id: `step-${index}`,
            instruction,
            distance: distStr,
            duration: durStr,
            mode: mode,
            iconType,
            subText: step.name ? `Yo'l: ${step.name}` : undefined,
          };
        });

        // If transit mode, weave in transit steps
        const enhancedSteps = mode === 'transit' 
          ? buildTransitSteps(originLat, originLng, destLat, destLng, distanceKm, durationMin, transitHint)
          : steps;

        return {
          coordinates,
          distanceKm: distanceKm || 0.5,
          durationMin: durationMin || 2,
          steps: enhancedSteps.length > 0 ? enhancedSteps : generateFallbackSteps(mode, distanceKm),
          transitInfo: mode === 'transit' ? transitHint || generateDefaultTransit(distanceKm) : undefined,
        };
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('Network routing fallback activated:', err?.message || err);
    }
  }

  // Fallback realistic path generator
  return generateRealisticFallbackRoute(originLat, originLng, destLat, destLng, mode, transitHint);
}

function formatStepInstruction(
  type: string,
  modifier: string | undefined,
  roadName: string,
  mode: 'walk' | 'drive' | 'transit'
): string {
  const nameStr = roadName ? `"${roadName}" bo'ylab` : "to'g'ri";
  const verb = mode === 'walk' ? 'yuring' : 'harakatlaning';

  if (type === 'depart') {
    return `${nameStr} yo'lga chiqing va ${verb}`;
  }
  if (type === 'arrive') {
    return 'Belgilangan manzilga yetib keldingiz!';
  }
  if (type === 'roundabout') {
    return `Aylanma yo'lga kiring va ${modifier || "to'g'ri"} chiqish yo'lidan davom eting`;
  }

  switch (modifier) {
    case 'left':
    case 'slight left':
    case 'sharp left':
      return `Chapga buriling (${nameStr})`;
    case 'right':
    case 'slight right':
    case 'sharp right':
      return `O'ngga buriling (${nameStr})`;
    case 'straight':
      return `${nameStr} to'g'ri ${verb}`;
    case 'uturn':
      return `Orqaga qayrilib oling (U-turn)`;
    default:
      return `${nameStr} ${verb}`;
  }
}

function buildTransitSteps(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  distKm: number,
  durMin: number,
  transit?: TransitInfo
): RouteStep[] {
  const bus = transit?.busNumbers?.[0] || '14, 28, 51-sonli';
  const metro = transit?.metroLine || 'Eng yaqin metro liniyasi';
  const depStation = transit?.departureStation || 'Eng yaqin bekat';
  const arrStation = transit?.arrivalStation || 'Manzilga yaqin bekat';

  return [
    {
      id: 'tr-1',
      instruction: `${depStation}gacha piyoda yuring`,
      distance: '180 m',
      duration: '3 daq',
      mode: 'walk',
      iconType: 'straight',
      subText: "Piyodalar yo'lagidan foydalaning",
    },
    {
      id: 'tr-2',
      instruction: `${bus} avtobusiga yoki ${metro}ga mining`,
      distance: `${distKm} km`,
      duration: `${Math.max(5, durMin - 6)} daq`,
      mode: 'transit',
      iconType: 'bus',
      subText: `${depStation}dan ${arrStation}gacha (${transit?.stopsCount || 4} ta bekat). Chipta: ${transit?.farePrice || "1 700 - 3 000 so'm"}`,
    },
    {
      id: 'tr-3',
      instruction: `${arrStation}da tushing va manzilga qarab piyoda yuring`,
      distance: '120 m',
      duration: '2 daq',
      mode: 'walk',
      iconType: 'arrive',
      subText: 'Manzil o\'ng tarafingizda joylashgan',
    },
  ];
}

function generateDefaultTransit(distKm: number): TransitInfo {
  return {
    busNumbers: ['18', '38', '51', '97'],
    metroLine: 'Metro / Avtobus ekspress yo\'nalishi',
    departureStation: 'Eng yaqin jamoat bekati',
    arrivalStation: 'Manzil bekati',
    stopsCount: Math.max(2, Math.round(distKm * 2.2)),
    farePrice: "1 700 so'm (ATTO / karta)",
  };
}

function generateFallbackSteps(mode: 'walk' | 'drive' | 'transit', distKm: number): RouteStep[] {
  if (mode === 'drive') {
    return [
      {
        id: 'dr-1',
        instruction: "Boshlang'ich nuqtadan asosiy yo'lga chiqing",
        distance: '200 m',
        duration: '1 daq',
        mode: 'drive',
        iconType: 'straight',
      },
      {
        id: 'dr-2',
        instruction: "Svetofordan to'g'ri o'ting va shoh ko'cha bo'ylab davom eting",
        distance: `${Math.max(0.5, distKm - 0.4).toFixed(1)} km`,
        duration: '4 daq',
        mode: 'drive',
        iconType: 'straight',
      },
      {
        id: 'dr-3',
        instruction: "Belgilangan manzil darvozasiga buriling",
        distance: '150 m',
        duration: '1 daq',
        mode: 'drive',
        iconType: 'arrive',
      },
    ];
  }

  return [
    {
      id: 'wk-1',
      instruction: "Piyodalar yo'lagi bo'ylab to'g'ri yuring",
      distance: '250 m',
      duration: '3 daq',
      mode: 'walk',
      iconType: 'straight',
    },
    {
      id: 'wk-2',
      instruction: "Piyodalar o'tish joyidan (zebra) o'ting",
      distance: '40 m',
      duration: '1 daq',
      mode: 'walk',
      iconType: 'turn-left',
    },
    {
      id: 'wk-3',
      instruction: "Manzil tomon piyoda davom eting",
      distance: `${Math.max(0.2, distKm - 0.3).toFixed(1)} km`,
      duration: '5 daq',
      mode: 'walk',
      iconType: 'arrive',
    },
  ];
}

// Generate realistic polyline along roads with city street grid effect
function generateRealisticFallbackRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'walk' | 'drive' | 'transit',
  transitHint?: TransitInfo
): RouteDetail {
  const points: [number, number][] = [];
  const stepsCount = 12;

  // Manhattan / grid routing pattern (real streets turn at 90-degree street grids)
  const midLat = originLat + (destLat - originLat) * 0.6;
  const midLng = originLng + (destLng - originLng) * 0.4;

  for (let i = 0; i <= stepsCount; i++) {
    const t = i / stepsCount;
    // Cubic bezier or grid approximation
    let lat: number;
    let lng: number;

    if (t < 0.5) {
      const subT = t * 2;
      lat = originLat + (midLat - originLat) * subT;
      lng = originLng + (midLng - originLng) * (subT * subT);
    } else {
      const subT = (t - 0.5) * 2;
      lat = midLat + (destLat - midLat) * (subT * Math.sqrt(subT));
      lng = midLng + (destLng - midLng) * subT;
    }

    // Add tiny road curvature
    if (i > 0 && i < stepsCount) {
      const wiggle = (Math.sin(i * 1.5) * 0.0003) * (mode === 'walk' ? 1.5 : 0.8);
      lat += wiggle;
      lng += wiggle * 0.5;
    }

    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  // Calculate straight distance
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = 6371 * c;
  const realDist = Math.max(0.2, Math.round(rawDist * 1.25 * 10) / 10);

  const walkMin = Math.max(2, Math.round((realDist / 4.5) * 60));
  const driveMin = Math.max(1, Math.round((realDist / 35) * 60));
  const transitMin = Math.max(4, Math.round((realDist / 22) * 60 + 5));

  const dur = mode === 'walk' ? walkMin : mode === 'drive' ? driveMin : transitMin;

  return {
    coordinates: points,
    distanceKm: realDist,
    durationMin: dur,
    steps: mode === 'transit'
      ? buildTransitSteps(originLat, originLng, destLat, destLng, realDist, transitMin, transitHint)
      : generateFallbackSteps(mode, realDist),
    transitInfo: mode === 'transit' ? transitHint || generateDefaultTransit(realDist) : undefined,
  };
}
