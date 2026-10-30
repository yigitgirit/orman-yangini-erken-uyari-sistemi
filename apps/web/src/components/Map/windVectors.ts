export interface WindVectorFeature {
  type: "Feature";
  properties: {
    stationId: number;
    speed: number;
    direction: number;
    color: string;
    width: number;
  };
  geometry: {
    type: "MultiLineString";
    coordinates: [number, number][][];
  };
}

/**
 * 3D Topografik harita üzerinde istasyon bazlı aerodinamik rüzgâr okları üretir.
 * Rüzgâr yön açısı (azimut) ve hızına göre ok boyu ve kanatçıkları (barbs) hesaplanır.
 */
export function generateWindVectorFeature(
  lat: number,
  lng: number,
  stationId: number,
  windDirectionDeg: number,
  windSpeedMs: number,
): WindVectorFeature {
  const latDegreeMeters = 111320;
  const lngDegreeMeters = 111320 * Math.cos((lat * Math.PI) / 180);

  // Rüzgâr hızına bağlı dinamik ok uzunluğu (metre cinsinden)
  const shaftLength = Math.max(220, Math.min(850, 200 + windSpeedMs * 35));
  const barbLength = shaftLength * 0.28;

  // Matematiksel radyan (0° Kuzey = +Y, 90° Doğu = +X)
  const mathRad = ((90 - windDirectionDeg) * Math.PI) / 180;

  // Ok ucu (Tip) koordinatları
  const tipX = shaftLength * Math.cos(mathRad);
  const tipY = shaftLength * Math.sin(mathRad);
  const tipLng = lng + tipX / lngDegreeMeters;
  const tipLat = lat + tipY / latDegreeMeters;

  // Ok kanatçıkları açıları (±145 derece geriye doğru)
  const leftBarbAngle = mathRad + (145 * Math.PI) / 180;
  const rightBarbAngle = mathRad - (145 * Math.PI) / 180;

  const leftBarbLng = tipLng + (barbLength * Math.cos(leftBarbAngle)) / lngDegreeMeters;
  const leftBarbLat = tipLat + (barbLength * Math.sin(leftBarbAngle)) / latDegreeMeters;

  const rightBarbLng = tipLng + (barbLength * Math.cos(rightBarbAngle)) / lngDegreeMeters;
  const rightBarbLat = tipLat + (barbLength * Math.sin(rightBarbAngle)) / latDegreeMeters;

  // Hıza göre renk ve kalınlık kademelendirmesi
  let color = "#38bdf8"; // Sakin / Hafif esinti (< 4 m/s)
  let width = 2;

  if (windSpeedMs >= 14) {
    color = "#ef4444"; // Fırtına / Yangın körükleyici (>= 14 m/s)
    width = 3.5;
  } else if (windSpeedMs >= 8) {
    color = "#f59e0b"; // Sert rüzgâr (8 - 14 m/s)
    width = 3.0;
  } else if (windSpeedMs >= 4) {
    color = "#10b981"; // Ilımlı rüzgâr (4 - 8 m/s)
    width = 2.4;
  }

  return {
    type: "Feature",
    properties: {
      stationId,
      speed: Math.round(windSpeedMs * 10) / 10,
      direction: Math.round(windDirectionDeg),
      color,
      width,
    },
    geometry: {
      type: "MultiLineString",
      coordinates: [
        // 1. Ana gövde çizgisi (İstasyondan ok ucuna)
        [
          [lng, lat],
          [tipLng, tipLat],
        ],
        // 2. Sol aerodinamik kanatçık
        [
          [tipLng, tipLat],
          [leftBarbLng, leftBarbLat],
        ],
        // 3. Sağ aerodinamik kanatçık
        [
          [tipLng, tipLat],
          [rightBarbLng, rightBarbLat],
        ],
      ],
    },
  };
}
