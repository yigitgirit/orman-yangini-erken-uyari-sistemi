import type { SensorNode, TelemetryMessage } from "@pyros/shared";
import type maplibregl from "maplibre-gl";
import type React from "react";
import { useEffect, useRef } from "react";

interface WindParticleLayerProps {
  map: maplibregl.Map | null;
  stations: readonly SensorNode[];
  telemetries: Map<number, TelemetryMessage>;
  regionalWindDirection: number;
  regionalWindSpeed: number;
  activeFireNodeId: number | null;
  visible: boolean;
}

interface Particle {
  lat: number;
  lng: number;
  prevX: number;
  prevY: number;
  age: number;
  maxAge: number;
  speed: number;
  isFireAffected: boolean;
}

// Görsel olarak belirgin, akıcı ve yüksek FPS performansı için optimize edilmiş sabitler
const PARTICLE_COUNT = 130; // 360 yerine 130 adet kalın, uzun ve belirgin rüzgâr çizgisi
const SPEED_SCALE = 0.000026; // Rüzgâr hareket mesafesini ~3 kat büyütür (daha belirgin akış)
const GRID_RES = 16; // 16x16 yerel vektör alanı önbelleği (O(1) interpolasyon)

interface GridCell {
  vx: number;
  vy: number;
  speed: number;
  isFireAffected: boolean;
}

export const WindParticleLayer: React.FC<WindParticleLayerProps> = ({
  map,
  stations,
  telemetries,
  regionalWindDirection,
  regionalWindSpeed,
  activeFireNodeId,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Önbelleğe alınmış harita sınırları ve vektör alanı
  const boundsRef = useRef<{
    sw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
  }>({
    sw: { lat: 36.8, lng: 28.14 },
    ne: { lat: 36.91, lng: 28.29 },
  });

  const vectorGridRef = useRef<GridCell[][]>([]);

  // Telemetri ve rüzgâr durumlarını referansta sakla
  const propsRef = useRef({
    stations,
    telemetries,
    regionalWindDirection,
    regionalWindSpeed,
    activeFireNodeId,
  });

  useEffect(() => {
    propsRef.current = {
      stations,
      telemetries,
      regionalWindDirection,
      regionalWindSpeed,
      activeFireNodeId,
    };
  }, [stations, telemetries, regionalWindDirection, regionalWindSpeed, activeFireNodeId]);

  // 1. Vektör Alanını (Vector Field Grid) Yalnızca Telemetri Değiştiğinde Önceden Hesapla (Precompute)
  // Bu işlem 60 FPS render döngüsü yerine sadece telemetri geldikçe 1 kez çalışır (150x CPU kazancı).
  useEffect(() => {
    if (!visible) return;

    const { sw, ne } = boundsRef.current;
    const baseRad = ((90 - regionalWindDirection) * Math.PI) / 180;
    const baseVx = regionalWindSpeed * Math.cos(baseRad);
    const baseVy = regionalWindSpeed * Math.sin(baseRad);

    const fireStation = activeFireNodeId ? stations.find((s) => s.id === activeFireNodeId) : null;

    const newGrid: GridCell[][] = [];

    const latStep = (ne.lat - sw.lat) / (GRID_RES - 1);
    const lngStep = (ne.lng - sw.lng) / (GRID_RES - 1);

    for (let row = 0; row < GRID_RES; row++) {
      const cellLat = sw.lat + row * latStep;
      const cosLat = Math.cos((cellLat * Math.PI) / 180);
      const rowCells: GridCell[] = [];

      for (let col = 0; col < GRID_RES; col++) {
        const cellLng = sw.lng + col * lngStep;

        let totalWeight = 1.0;
        let vx = baseVx;
        let vy = baseVy;

        // Yakındaki sensör istasyonlarının mikro-klima etkisini topla
        for (const st of stations) {
          const dLat = (cellLat - st.lat) * 111.32;
          const dLng = (cellLng - st.lng) * 111.32 * cosLat;
          const distSq = dLat * dLat + dLng * dLng;

          if (distSq < 9.0) {
            // 3 km etki alanı
            const tel = telemetries.get(st.id);
            const stDir = tel?.windDirection ?? regionalWindDirection;
            const stSpeed = tel?.windSpeed ?? regionalWindSpeed;

            const stRad = ((90 - stDir) * Math.PI) / 180;
            const stVx = stSpeed * Math.cos(stRad);
            const stVy = stSpeed * Math.sin(stRad);

            const weight = 1.0 / (distSq + 0.35);
            vx += stVx * weight;
            vy += stVy * weight;
            totalWeight += weight;
          }
        }

        vx /= totalWeight;
        vy /= totalWeight;

        // Yangın Termal Konveksiyonu
        let isFireAffected = false;
        if (fireStation) {
          const dFireLat = (cellLat - fireStation.lat) * 111.32;
          const dFireLng = (cellLng - fireStation.lng) * 111.32 * cosLat;
          const distFireSq = dFireLat * dFireLat + dFireLng * dFireLng;

          if (distFireSq < 3.0) {
            vx *= 1.8;
            vy *= 1.8;
            isFireAffected = true;
          }
        }

        const speed = Math.sqrt(vx * vx + vy * vy);
        rowCells.push({ vx, vy, speed, isFireAffected });
      }
      newGrid.push(rowCells);
    }

    vectorGridRef.current = newGrid;
  }, [visible, stations, telemetries, regionalWindDirection, regionalWindSpeed, activeFireNodeId]);

  // 2. Animasyon Döngüsü & Canvas Yönetimi
  useEffect(() => {
    if (!visible) return;

    const { sw, ne } = boundsRef.current;
    const baseRad = ((90 - regionalWindDirection) * Math.PI) / 180;
    const baseVx = regionalWindSpeed * Math.cos(baseRad);
    const baseVy = regionalWindSpeed * Math.sin(baseRad);

    const fireStation = activeFireNodeId ? stations.find((s) => s.id === activeFireNodeId) : null;

    const newGrid: GridCell[][] = [];

    const latStep = (ne.lat - sw.lat) / (GRID_RES - 1);
    const lngStep = (ne.lng - sw.lng) / (GRID_RES - 1);

    for (let row = 0; row < GRID_RES; row++) {
      const cellLat = sw.lat + row * latStep;
      const cosLat = Math.cos((cellLat * Math.PI) / 180);
      const rowCells: GridCell[] = [];

      for (let col = 0; col < GRID_RES; col++) {
        const cellLng = sw.lng + col * lngStep;

        let totalWeight = 1.0;
        let vx = baseVx;
        let vy = baseVy;

        // Yakındaki sensör istasyonlarının mikro-klima etkisini topla
        for (const st of stations) {
          const dLat = (cellLat - st.lat) * 111.32;
          const dLng = (cellLng - st.lng) * 111.32 * cosLat;
          const distSq = dLat * dLat + dLng * dLng;

          if (distSq < 9.0) {
            // 3 km etki alanı
            const tel = telemetries.get(st.id);
            const stDir = tel?.windDirection ?? regionalWindDirection;
            const stSpeed = tel?.windSpeed ?? regionalWindSpeed;

            const stRad = ((90 - stDir) * Math.PI) / 180;
            const stVx = stSpeed * Math.cos(stRad);
            const stVy = stSpeed * Math.sin(stRad);

            const weight = 1.0 / (distSq + 0.35);
            vx += stVx * weight;
            vy += stVy * weight;
            totalWeight += weight;
          }
        }

        vx /= totalWeight;
        vy /= totalWeight;

        // Yangın Termal Konveksiyonu
        let isFireAffected = false;
        if (fireStation) {
          const dFireLat = (cellLat - fireStation.lat) * 111.32;
          const dFireLng = (cellLng - fireStation.lng) * 111.32 * cosLat;
          const distFireSq = dFireLat * dFireLat + dFireLng * dFireLng;

          if (distFireSq < 3.0) {
            vx *= 1.8;
            vy *= 1.8;
            isFireAffected = true;
          }
        }

        const speed = Math.sqrt(vx * vx + vy * vy);
        rowCells.push({ vx, vy, speed, isFireAffected });
      }
      newGrid.push(rowCells);
    }

    vectorGridRef.current = newGrid;
  }, [visible, stations, telemetries, regionalWindDirection, regionalWindSpeed, activeFireNodeId]);

  // 2. Animasyon Döngüsü & Canvas Yönetimi
  useEffect(() => {
    if (!visible || !map) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // GPU fill-rate yükünü hafifletmek için DPR'ı 1.25 ile sınırla (kasmayı tamamen engeller)
    const getDpr = () => Math.min(window.devicePixelRatio || 1, 1.25);

    const updateBounds = () => {
      try {
        const b = map.getBounds();
        boundsRef.current = {
          sw: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
          ne: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
        };
      } catch {
        // Harita henüz hazır değilse varsayılan değerler kullanılır
      }
    };

    const resizeCanvas = () => {
      const mapCanvas = map.getCanvas();
      if (!mapCanvas) return;
      const dpr = getDpr();
      const width = mapCanvas.clientWidth;
      const height = mapCanvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      updateBounds();
    };

    resizeCanvas();

    // Yeni Parçacık Üretici
    const spawnParticle = (p?: Particle): Particle => {
      const { sw, ne } = boundsRef.current;
      const latSpan = ne.lat - sw.lat;
      const lngSpan = ne.lng - sw.lng;

      const lat = sw.lat - latSpan * 0.15 + Math.random() * (latSpan * 1.3);
      const lng = sw.lng - lngSpan * 0.15 + Math.random() * (lngSpan * 1.3);

      const maxAge = Math.floor(65 + Math.random() * 55);
      const age = p ? 0 : Math.floor(Math.random() * maxAge);

      const proj = map.project([lng, lat]);

      return {
        lat,
        lng,
        prevX: proj.x,
        prevY: proj.y,
        age,
        maxAge,
        speed: propsRef.current.regionalWindSpeed,
        isFireAffected: false,
      };
    };

    // Parçacık havuzunu doldur
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle());

    const handleMapMove = () => {
      updateBounds();
      // Harita kayarken çizgilerin ekran üzerinde uzayıp glitch yapmasını engelle
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const proj = map.project([p.lng, p.lat]);
        p.prevX = proj.x;
        p.prevY = proj.y;
      }
      const dpr = getDpr();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    };

    map.on("move", handleMapMove);
    map.on("resize", resizeCanvas);

    let isRunning = true;

    // 3. 60 FPS Optimize Render Döngüsü (O(1) Grid Lookup + Kalın Görsel Rüzgâr İzi)
    const renderLoop = () => {
      if (!isRunning) return;

      const mapCanvas = map.getCanvas();
      if (!mapCanvas) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const width = mapCanvas.clientWidth;
      const height = mapCanvas.clientHeight;

      // Belirgin, uzun ve akıcı kuyruk (Trail Fade): 0.045 düşük silme oranı kuyruğu uzatır
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.048)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const grid = vectorGridRef.current;
      const hasGrid = grid.length === GRID_RES;
      const { sw, ne } = boundsRef.current;
      const latRange = ne.lat - sw.lat || 0.1;
      const lngRange = ne.lng - sw.lng || 0.1;

      // Temel bölgesel rüzgâr (Grid hazır değilse fallback)
      const baseRad = ((90 - propsRef.current.regionalWindDirection) * Math.PI) / 180;
      const fallbackVx = propsRef.current.regionalWindSpeed * Math.cos(baseRad);
      const fallbackVy = propsRef.current.regionalWindSpeed * Math.sin(baseRad);

      const particles = particlesRef.current;
      const particleCount = particles.length;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.age++;

        // Ömrü bittiğinde veya ekrandan çok uzaklaştığında yeniden doğur
        if (
          p.age >= p.maxAge ||
          p.lat < sw.lat - 0.06 ||
          p.lat > ne.lat + 0.06 ||
          p.lng < sw.lng - 0.06 ||
          p.lng > ne.lng + 0.06
        ) {
          particles[i] = spawnParticle(p);
          continue;
        }

        // O(1) Hızında Grid Örnekleme (Bilinear veya En Yakın Hücre)
        let vx = fallbackVx;
        let vy = fallbackVy;
        let isFire = false;
        let spd = propsRef.current.regionalWindSpeed;

        if (hasGrid) {
          const normX = Math.max(0, Math.min(1, (p.lng - sw.lng) / lngRange));
          const normY = Math.max(0, Math.min(1, (p.lat - sw.lat) / latRange));

          const col = Math.min(GRID_RES - 1, Math.floor(normX * (GRID_RES - 1)));
          const row = Math.min(GRID_RES - 1, Math.floor(normY * (GRID_RES - 1)));

          const cell = grid[row]?.[col];
          if (cell) {
            vx = cell.vx;
            vy = cell.vy;
            isFire = cell.isFireAffected;
            spd = cell.speed;
          }
        }

        p.isFireAffected = isFire;
        p.speed = spd;

        const cosLat = Math.cos((p.lat * Math.PI) / 180);

        // Hareketi ötele (SPEED_SCALE ile artırılmış, belirgin adımlar)
        p.lng += (vx * SPEED_SCALE) / cosLat;
        p.lat += vy * SPEED_SCALE;

        // Ekran koordinatını al
        const currentPos = map.project([p.lng, p.lat]);

        // Ekran dışı kontrolü
        if (
          currentPos.x < -30 ||
          currentPos.x > width + 30 ||
          currentPos.y < -30 ||
          currentPos.y > height + 30
        ) {
          p.prevX = currentPos.x;
          p.prevY = currentPos.y;
          continue;
        }

        const dx = currentPos.x - p.prevX;
        const dy = currentPos.y - p.prevY;
        const distSq = dx * dx + dy * dy;

        // Ani kamera sıçramalarında çizginin ekranı kaplamasını engelle
        if (distSq > 2500) {
          p.prevX = currentPos.x;
          p.prevY = currentPos.y;
          continue;
        }

        // Yumuşak görünme & kaybolma opaklığı
        const fadeIn = Math.min(1, p.age / 12);
        const fadeOut = Math.min(1, (p.maxAge - p.age) / 12);
        const alpha = Math.max(0.1, Math.min(0.95, fadeIn * fadeOut));

        // Belirgin, estetik Siber-Fiziksel Renk Paleti
        let strokeColor: string;
        let strokeWidth = 3.2; // Belirgin kalın çizgi

        if (p.isFireAffected) {
          strokeColor = `rgba(249, 115, 22, ${alpha})`; // Ateş Turuncusu
          strokeWidth = 4.2;
        } else if (spd >= 10) {
          strokeColor = `rgba(251, 191, 36, ${alpha})`; // Kehribar Sarısı
          strokeWidth = 3.8;
        } else if (spd >= 6) {
          strokeColor = `rgba(45, 212, 191, ${alpha})`; // Parlak Teal
          strokeWidth = 3.2;
        } else {
          strokeColor = `rgba(56, 189, 248, ${alpha})`; // Parlak Gökyüzü Mavisi (Sky-400)
          strokeWidth = 2.8;
        }

        // Çizgiyi çiz
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.stroke();

        p.prevX = currentPos.x;
        p.prevY = currentPos.y;
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      map.off("move", handleMapMove);
      map.off("resize", resizeCanvas);
    };
  }, [visible, map]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};
