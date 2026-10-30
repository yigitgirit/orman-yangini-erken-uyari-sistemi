// Rüzgâr vektörü yardımcıları (yön kuralları: types.ts -> WindVector)
import type { WindVector } from "./types.ts";

const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;
const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Hız + meteorolojik yön (geldiği yön) -> vektör */
export function windFromSpeedDir(speed: number, directionFrom: number): WindVector {
  const to = norm360(directionFrom + 180);
  const rad = (to * Math.PI) / 180;
  return {
    speed: round(speed),
    directionFrom: round(norm360(directionFrom), 1),
    directionTo: round(to, 1),
    u: round(speed * Math.sin(rad)),
    v: round(speed * Math.cos(rad)),
  };
}

/** Akış bileşenleri (u doğu, v kuzey) -> vektör. Açıların ortalaması için bileşenler ortalanmalı. */
export function windFromComponents(u: number, v: number): WindVector {
  const speed = Math.hypot(u, v);
  const to = norm360((Math.atan2(u, v) * 180) / Math.PI);
  return windFromSpeedDir(speed, to + 180);
}
