// Rothermel / Huygens Eliptik Yangın Yayılım Modeli
// Akdeniz Kızılçamı (Pinus brutia) ve maki örtüsü için rüzgâr güdümlü yayılma elipsleri üretir.
// Çıktı: İleriye dönük 15 dk (Tahliye), 30 dk (Müdahale), 60 dk (Tehdit Sınırı) GeoJSON poligonları.

import type { FireSpreadPrediction, FireSpreadZone, SensorNode } from "@pyros/shared";

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

interface RothermelParams {
  r0: number; // m/s taban yayılma hızı (rüzgârsız kuru ibre örtüsü: ~0.06 m/s = 3.6 m/dk)
  windMultiplier: number; // c rüzgâr katsayısı (~0.28)
  windExponent: number; // B rüzgâr üssü (~1.35)
}

const DEFAULT_PARAMS: RothermelParams = {
  r0: 0.065,
  windMultiplier: 0.28,
  windExponent: 1.35,
};

/**
 * Anlık yangın düğümü ve rüzgâr vektöründen 15, 30 ve 60 dakikalık yayılma elipslerini hesaplar.
 */
export function calculateFireSpread(
  fireNode: SensorNode,
  windSpeed = 7.2,
  windDirectionDeg = 30,
  params = DEFAULT_PARAMS,
): FireSpreadPrediction {
  const U = Math.max(0.5, windSpeed);
  // Rüzgârın gittiği yön (dumanın ve alevin sürüklendiği azimut)
  const downwindDeg = (windDirectionDeg + 180) % 360;
  const downwindRad = (downwindDeg * Math.PI) / 180;

  // 1. İleri yayılma hızı (Rhead, m/s)
  const phiW = params.windMultiplier * U ** params.windExponent;
  const rHead = params.r0 * (1 + phiW);

  // 2. Elips uzunluk/genişlik oranı (Anderson 1983)
  const lengthToBreadth = Math.min(4.5, Math.max(1.1, 1.0 + 0.25 * U));
  const eccentricity = Math.sqrt(1 - 1 / (lengthToBreadth * lengthToBreadth));

  // 3. Geriye yayılma hızı (Rback, rüzgâra karşı yangın yavaş ilerler)
  const rBack = rHead * ((1 - eccentricity) / (1 + eccentricity));

  const horizonsMin = [
    { min: 15, level: "evacuate" as const, color: "#ef4444" },
    { min: 30, level: "containment" as const, color: "#f97316" },
    { min: 60, level: "threat" as const, color: "#eab308" },
  ];

  const mLat = M_PER_DEG_LAT;
  const mLng = mPerDegLng(fireNode.lat);

  const zones: FireSpreadZone[] = horizonsMin.map(({ min, level, color }) => {
    const tSec = min * 60;
    const totalLengthM = (rHead + rBack) * tSec;
    const a = totalLengthM / 2; // Yarı büyük eksen (m)
    const b = a / lengthToBreadth; // Yarı küçük eksen (m)

    // Yangın başlangıç noktası (odak) elipsin merkezinden rüzgâr yönünün tersine kayıktır
    const centerOffsetM = rHead * tSec - a;

    // Elipsin coğrafi merkez noktası
    const centerDeltaX = centerOffsetM * Math.sin(downwindRad);
    const centerDeltaY = centerOffsetM * Math.cos(downwindRad);
    const centerLat = fireNode.lat + centerDeltaY / mLat;
    const centerLng = fireNode.lng + centerDeltaX / mLng;

    // 36 köşe noktası ile GeoJSON poligonu üret (saat yönünde)
    const points: [number, number][] = [];
    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const phi = (i * 2 * Math.PI) / steps;
      // Yerel koordinat (x ekseni yan genişlik, y ekseni ileri yön)
      const xLocal = b * Math.cos(phi);
      const yLocal = a * Math.sin(phi);

      // Rüzgâr yönüne (downwindDeg) göre döndür
      const rotX = xLocal * Math.cos(downwindRad) + yLocal * Math.sin(downwindRad);
      const rotY = -xLocal * Math.sin(downwindRad) + yLocal * Math.cos(downwindRad);

      const ptLat = centerLat + rotY / mLat;
      const ptLng = centerLng + rotX / mLng;
      points.push([Number(ptLng.toFixed(6)), Number(ptLat.toFixed(6))]);
    }
    // GeoJSON poligonunu kapat (ilk nokta == son nokta)
    points.push(points[0]);

    // Hektar cinsinden alan: pi * a * b / 10000
    const areaHectares = Number(((Math.PI * a * b) / 10_000).toFixed(2));
    const forwardDistanceM = Number((rHead * tSec).toFixed(1));

    return {
      horizonMin: min,
      level,
      color,
      areaHectares,
      forwardDistanceM,
      polygon: points,
    };
  });

  return {
    activeFireNodeId: fireNode.id,
    generatedAt: new Date().toISOString(),
    windSpeed: Number(U.toFixed(1)),
    windDirectionDeg: Math.round(windDirectionDeg),
    zones,
  };
}
