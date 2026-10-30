export interface SpreadPolygonFeature {
  type: "Feature";
  properties: {
    source: string;
    windDeg: number;
    windSpeed: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

/**
 * Huygens Yangın Yayılım Modeli (Eliptik Yayılım Geometrisi)
 * Yangın rüzgâr yönü boyunca eliptik bir formda yayılır.
 * Bu fonksiyon sensör koordinatı, rüzgâr yönü ve hızına göre GeoJSON Poligon koordinatları üretir.
 */
export function generateHuygensSpreadPolygon(
  centerLat: number,
  centerLng: number,
  windDirectionDeg: number, // 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı
  windSpeedMs: number, // Rüzgâr hızı (m/s)
  scaleMinutes: number = 20, // Tahmini yayılma süresi (dk)
): SpreadPolygonFeature {
  const points = 36;
  const coordinates: [number, number][] = [];

  // 1 derece enlem ~111,000 metre, boylam enleme göre küçülür
  const latDegreeMeters = 111320;
  const lngDegreeMeters = 111320 * Math.cos((centerLat * Math.PI) / 180);

  // Huygens elips boyutları (metre cinsinden)
  // Rüzgâr hızı arttıkça elips boyuna uzar
  const forwardSpeedMPerMin = 15 + windSpeedMs * 4.5; // Baş ilerleme hızı
  const flankSpeedMPerMin = 8 + windSpeedMs * 1.2; // Yanal yayılma hızı
  const backSpeedMPerMin = 4; // Rüzgâr tersine yavaş yayılma

  const semiMajor = ((forwardSpeedMPerMin + backSpeedMPerMin) * scaleMinutes) / 2;
  const semiMinor = flankSpeedMPerMin * scaleMinutes;
  const forwardOffset = ((forwardSpeedMPerMin - backSpeedMPerMin) * scaleMinutes) / 2;

  // Rüzgârın estiği yönün radyanı (Matematiksel açıya dönüşüm)
  // 0° Kuzey = +Y ekseni, 90° Doğu = +X ekseni
  const windRad = ((90 - windDirectionDeg) * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;

    // Standart elips koordinatı (Merkez ofsetli)
    const localX = forwardOffset + semiMajor * Math.cos(angle);
    const localY = semiMinor * Math.sin(angle);

    // Rüzgâr yönüne göre döndür (Rotasyon)
    const rotX = localX * Math.cos(windRad) - localY * Math.sin(windRad);
    const rotY = localX * Math.sin(windRad) + localY * Math.cos(windRad);

    // Metreyi enlem/boylam ofsetine çevir
    const ptLng = centerLng + rotX / lngDegreeMeters;
    const ptLat = centerLat + rotY / latDegreeMeters;

    coordinates.push([ptLng, ptLat]);
  }

  return {
    type: "Feature",
    properties: {
      source: "HuygensSpreadModel",
      windDeg: windDirectionDeg,
      windSpeed: windSpeedMs,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}
