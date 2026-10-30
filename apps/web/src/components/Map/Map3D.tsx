import { RadioTower } from "lucide-react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { REGION_CENTER } from "../../services/mockEngine";
import type { GatewayInfo, SensorStation, TelemetryReading } from "../../types/simulation";
import { generateHuygensSpreadPolygon } from "./spreadCone";
import { generateWindVectorFeature } from "./windVectors";

interface Map3DProps {
  stations: readonly SensorStation[];
  telemetries: Map<number, TelemetryReading>;
  gateways: readonly GatewayInfo[];
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  showWindLayer: boolean;
  cameraFocusId: number | null;
  selectedStationId: number | null;
  selectedGatewayId: number | null;
  onSelectStation: (id: number) => void;
  onSelectGateway: (id: number) => void;
}

export const Map3D: React.FC<Map3DProps> = ({
  stations,
  telemetries,
  gateways,
  activeFireNodeId,
  windDirection,
  windSpeed,
  showWindLayer,
  cameraFocusId,
  selectedStationId,
  selectedGatewayId,
  onSelectStation,
  onSelectGateway,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // React Marker Portalları için DOM container haritaları
  const stationContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const gatewayContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [markersReady, setMarkersReady] = useState(false);

  // 1. Haritayı ve 3D Terrain'i İlklendir
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          // Yüksek Çözünürlüklü ESRI Dünya Uydu Görüntüsü
          "esri-satellite": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
            maxzoom: 19,
          },
          // 3D DEM Sayısal Yükseklik Modeli (AWS Terrarium Tiles)
          "terrain-source": {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 15,
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
        terrain: {
          source: "terrain-source",
          exaggeration: 1.35, // Dağ kabartmasını belirginleştir
        },
        sky: {
          "sky-color": "#09090b",
          "horizon-color": "#18181b",
          "fog-color": "#09090b",
          "fog-ground-blend": 0.5,
        },
      },
      center: [REGION_CENTER.lng, REGION_CENTER.lat],
      zoom: REGION_CENTER.zoom,
      pitch: REGION_CENTER.pitch,
      bearing: REGION_CENTER.bearing,
      maxPitch: 82,
    });

    map.on("load", () => {
      mapRef.current = map;

      // 1. Gateway LoRaWAN Kapsama Alanları (Draped GeoJSON)
      const gatewayPolygons = gateways.map((gw) => {
        const points = 32;
        const coords: [number, number][] = [];
        const radiusDegLat = gw.radiusMeters / 111320;
        const radiusDegLng = gw.radiusMeters / (111320 * Math.cos((gw.lat * Math.PI) / 180));

        for (let i = 0; i <= points; i++) {
          const theta = (i * 2 * Math.PI) / points;
          coords.push([
            gw.lng + radiusDegLng * Math.cos(theta),
            gw.lat + radiusDegLat * Math.sin(theta),
          ]);
        }

        return {
          type: "Feature" as const,
          properties: { name: gw.name },
          geometry: { type: "Polygon" as const, coordinates: [coords] },
        };
      });

      map.addSource("gateways-coverage", {
        type: "geojson",
        data: { type: "FeatureCollection", features: gatewayPolygons },
      });

      map.addLayer({
        id: "gateways-coverage-fill",
        type: "fill",
        source: "gateways-coverage",
        paint: {
          "fill-color": "#0284c7",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "gateways-coverage-line",
        type: "line",
        source: "gateways-coverage",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.5,
          "line-opacity": 0.45,
          "line-dasharray": [2, 2],
        },
      });

      // 2. Huygens Yangın Yayılım Konisi
      map.addSource("fire-spread-cone", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "fire-spread-cone-fill",
        type: "fill",
        source: "fire-spread-cone",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.28,
        },
      });

      map.addLayer({
        id: "fire-spread-cone-line",
        type: "line",
        source: "fire-spread-cone",
        paint: {
          "line-color": "#f87171",
          "line-width": 2,
          "line-opacity": 0.85,
        },
      });

      // 3. Alarm Odaklı Rüzgâr Vektör Çizgisi
      map.addSource("wind-vector", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "wind-vector-line",
        type: "line",
        source: "wind-vector",
        paint: {
          "line-color": "#fbbf24",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
        },
      });

      // 4. Tüm İstasyonların 3D Aerodinamik Rüzgâr Vektörleri Katmanı
      map.addSource("all-stations-wind", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "all-stations-wind-line",
        type: "line",
        source: "all-stations-wind",
        layout: {
          visibility: "none",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "width"],
          "line-opacity": 0.88,
        },
      });

      // 5. HTML DOM Marker Container'larını Oluştur ve MapLibre'ye Ekle
      for (const st of stations) {
        const el = document.createElement("div");
        el.className = "station-marker-root select-none pointer-events-auto";
        new maplibregl.Marker({ element: el }).setLngLat([st.lng, st.lat]).addTo(map);
        stationContainersRef.current.set(st.id, el);
      }

      for (const gw of gateways) {
        const el = document.createElement("div");
        el.className = "gateway-marker-root select-none pointer-events-auto";
        new maplibregl.Marker({ element: el }).setLngLat([gw.lng, gw.lat]).addTo(map);
        gatewayContainersRef.current.set(gw.id, el);
      }

      setMarkersReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [gateways, stations]);

  // 2. Yangın Yayılım Konisini ve Alarm Rüzgâr Çizgisini Güncelle
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const coneSource = map.getSource("fire-spread-cone") as maplibregl.GeoJSONSource | undefined;
    const windSource = map.getSource("wind-vector") as maplibregl.GeoJSONSource | undefined;

    if (!coneSource || !windSource) return;

    if (!activeFireNodeId) {
      coneSource.setData({ type: "FeatureCollection", features: [] });
      windSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const fireStation = stations.find((s) => s.id === activeFireNodeId);
    if (!fireStation) return;

    // Huygens elips poligonu üret
    const coneFeature = generateHuygensSpreadPolygon(
      fireStation.lat,
      fireStation.lng,
      windDirection,
      windSpeed,
      25,
    );
    coneSource.setData({ type: "FeatureCollection", features: [coneFeature] });

    // Rüzgâr yön çizgisi
    const rad = ((90 - windDirection) * Math.PI) / 180;
    const arrowLenMeters = 1800;
    const endLng =
      fireStation.lng +
      (arrowLenMeters * Math.cos(rad)) / (111320 * Math.cos((fireStation.lat * Math.PI) / 180));
    const endLat = fireStation.lat + (arrowLenMeters * Math.sin(rad)) / 111320;

    windSource.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [fireStation.lng, fireStation.lat],
              [endLng, endLat],
            ],
          },
        },
      ],
    });
  }, [activeFireNodeId, windDirection, windSpeed, stations]);

  // 3. Tüm İstasyonların 3D Rüzgâr Vektörlerini Güncelle ve Göster/Gizle
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const windLayer = map.getLayer("all-stations-wind-line");
    if (windLayer) {
      map.setLayoutProperty(
        "all-stations-wind-line",
        "visibility",
        showWindLayer ? "visible" : "none",
      );
    }

    if (!showWindLayer) return;

    const allWindSource = map.getSource("all-stations-wind") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!allWindSource) return;

    // Her istasyon için hız ve yönüne göre aerodinamik 3D ok özelliği oluştur
    const windFeatures = stations.map((st) => {
      const tel = telemetries.get(st.id);
      const dir = tel?.windDirection ?? windDirection;
      const speed = tel?.windSpeed ?? windSpeed;
      return generateWindVectorFeature(st.lat, st.lng, st.id, dir, speed);
    });

    allWindSource.setData({
      type: "FeatureCollection",
      features: windFeatures,
    });
  }, [showWindLayer, stations, telemetries, windDirection, windSpeed]);

  // 4. Kamera Odaklanma (flyTo)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraFocusId) return;

    const target = stations.find((s) => s.id === cameraFocusId);
    if (!target) return;

    map.flyTo({
      center: [target.lng, target.lat],
      zoom: 14.6,
      pitch: 66,
      bearing: -25,
      speed: 1.1,
      curve: 1.4,
      essential: true,
    });
  }, [cameraFocusId, stations]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-zinc-950">
      {/* 5. React DOM Markers: İkonlar, Belirgin Numaralar, Hover ve Seçim Animasyonları */}
      {markersReady && (
        <>
          {/* A. 31 Adet Siber-Fiziksel Sensör Düğümü (Node) */}
          {stations.map((st) => {
            const container = stationContainersRef.current.get(st.id);
            if (!container) return null;

            const tel = telemetries.get(st.id);
            const isSelected = st.id === selectedStationId;
            const riskLevel = tel?.riskLevel ?? "normal";

            return createPortal(
              <button
                key={st.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStation(st.id);
                }}
                className={`group relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 cursor-pointer focus:outline-none ${
                  isSelected ? "scale-150 z-30" : "hover:scale-125 z-10"
                }`}
              >
                {/* Siber-Fiziksel İstasyon Düğümü (Node İkonu) */}
                <div
                  className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                    riskLevel === "fire"
                      ? "bg-red-950/90 border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                      : riskLevel === "smoldering"
                        ? "bg-amber-950/90 border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        : st.isHardware
                          ? "bg-sky-950/90 border border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                          : "bg-zinc-950/90 border border-emerald-500/70 shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                  } ${isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950" : ""}`}
                >
                  {/* Düğüm Dış Radar Dalgaları (Yangın/Tütme anında hareketli) */}
                  {(riskLevel === "fire" || riskLevel === "smoldering") && (
                    <span
                      className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                        riskLevel === "fire" ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                  )}

                  {/* 4 Eksenli Mikro Düğüm Çentikleri (Teknik Görünüm) */}
                  <span className="absolute -top-0.5 w-0.5 h-1 bg-zinc-600/80" />
                  <span className="absolute -bottom-0.5 w-0.5 h-1 bg-zinc-600/80" />
                  <span className="absolute -left-0.5 h-0.5 w-1 bg-zinc-600/80" />
                  <span className="absolute -right-0.5 h-0.5 w-1 bg-zinc-600/80" />

                  {/* Merkezdeki LED Sensör Çekirdeği (Core Node) */}
                  <span
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      riskLevel === "fire"
                        ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                        : riskLevel === "smoldering"
                          ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]"
                          : st.isHardware
                            ? "bg-sky-400 shadow-[0_0_6px_#38bdf8]"
                            : "bg-emerald-400 shadow-[0_0_4px_#10b981]"
                    }`}
                  />
                </div>

                {/* Büyütülmüş ve Netleştirilmiş İstasyon Numarası Etiketi */}
                <span className="mt-1 px-1.5 py-0.5 bg-zinc-950/95 border border-zinc-700/90 rounded-sm text-xs font-mono font-bold text-zinc-100 shadow-md flex items-center gap-1 whitespace-nowrap">
                  <span>#{st.id}</span>
                  {st.isHardware && (
                    <span className="text-[10px] text-sky-400 font-semibold">[WOKWI]</span>
                  )}
                </span>
              </button>,
              container,
            );
          })}

          {/* B. 2 Adet LoRaWAN Ağ Geçidi Kulesi (Gateway) */}
          {gateways.map((gw) => {
            const container = gatewayContainersRef.current.get(gw.id);
            if (!container) return null;

            const isSelected = gw.id === selectedGatewayId;

            return createPortal(
              <button
                key={gw.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGateway(gw.id);
                }}
                className={`group relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 cursor-pointer focus:outline-none ${
                  isSelected ? "scale-150 z-30" : "hover:scale-125 z-20"
                }`}
              >
                {/* Kule / Yayın İkonu */}
                <div
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950/95 border border-sky-400 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-300 ${
                    isSelected ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-zinc-950" : ""
                  }`}
                >
                  <RadioTower className="h-4 w-4" />
                  {/* Soluk yayın dalgası */}
                  <span className="absolute inset-0 rounded-full animate-ping opacity-35 bg-sky-400" />
                </div>

                {/* Büyütülmüş ve Netleştirilmiş Kule Etiketi */}
                <span className="mt-1 px-1.5 py-0.5 bg-zinc-950/95 border border-sky-800/90 rounded-sm text-xs font-mono font-bold text-sky-300 shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <span>GW-0{gw.id}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </span>
              </button>,
              container,
            );
          })}
        </>
      )}
    </div>
  );
};
