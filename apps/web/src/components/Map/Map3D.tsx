import type { FireSpreadPrediction, NodeRisk, SensorNode, TelemetryMessage } from "@pyros/shared";
import { RadioTower } from "lucide-react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { REGION_CENTER } from "../../services/mockEngine";
import type { GatewayInfo } from "../../types/simulation";
import { generateHuygensSpreadPolygon } from "./spreadCone";
import { WindParticleLayer } from "./WindParticleLayer";
import { generateWindVectorFeature } from "./windVectors";

interface Map3DProps {
  stations: readonly SensorNode[];
  telemetries: Map<number, TelemetryMessage>;
  risks: Map<number, NodeRisk>;
  gateways: readonly GatewayInfo[];
  fireSpread?: FireSpreadPrediction | null;
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  showWindLayer?: boolean;
  showWindParticles?: boolean;
  showGatewayCoverage?: boolean;
  showStationVectors?: boolean;
  cameraFocus: { lat: number; lng: number } | null;
  selectedStationId: number | null;
  selectedGatewayId: number | null;
  adminMode?: "none" | "add_node" | "add_gateway" | "delete";
  onSelectStation: (id: number) => void;
  onSelectGateway: (id: number) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onDeleteRequest?: (target: { type: "node" | "gateway"; id: number; name: string }) => void;
}

export const Map3D: React.FC<Map3DProps> = ({
  stations,
  telemetries,
  risks,
  gateways,
  fireSpread,
  activeFireNodeId,
  windDirection,
  windSpeed,
  showWindLayer = false,
  showWindParticles = true,
  showGatewayCoverage = true,
  showStationVectors = false,
  cameraFocus,
  selectedStationId,
  selectedGatewayId,
  adminMode = "none",
  onSelectStation,
  onSelectGateway,
  onMapClick,
  onDeleteRequest,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [activeMap, setActiveMap] = useState<MapLibreMap | null>(null);

  // React Marker Portalları için DOM container haritaları
  const stationContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const gatewayContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [markersReady, setMarkersReady] = useState(false);
  const [, setMarkerRevision] = useState(0);

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
      map.addSource("gateways-coverage", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
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
          "line-dasharray": [3, 2],
        },
      });

      // 2. Yangın Yayılım Konisi (Huygens Elips Modeli)
      map.addSource("fire-spread-cone", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "fire-spread-cone-fill",
        type: "fill",
        source: "fire-spread-cone",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#ef4444"],
          "fill-opacity": ["coalesce", ["get", "opacity"], 0.28],
        },
      });

      map.addLayer({
        id: "fire-spread-cone-line",
        type: "line",
        source: "fire-spread-cone",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#dc2626"],
          "line-width": 1.5,
          "line-opacity": 0.85,
        },
      });

      // 3. Rüzgâr Yön Vektörü (Ok)
      map.addSource("wind-vector", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "wind-vector-line",
        type: "line",
        source: "wind-vector",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 3,
          "line-opacity": 0.9,
          "line-dasharray": [2, 1],
        },
      });

      // 4. 3D Rüzgâr Vektörleri Katmanı
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

      setMarkersReady(true);
      setActiveMap(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setActiveMap(null);
    };
  }, []);

  // Harita Tıklama ve Admin Cursor Yönetimi
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    map.on("click", clickHandler);
    const canvas = map.getCanvas();
    if (adminMode === "add_node" || adminMode === "add_gateway") {
      canvas.style.cursor = "crosshair";
    } else if (adminMode === "delete") {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "";
    }

    return () => {
      map.off("click", clickHandler);
    };
  }, [adminMode, onMapClick]);

  // İstasyonlar dinamik olarak değiştiğinde Marker'ları senkronize et (Ekleme / Silme)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersReady) return;

    let hasChanges = false;
    const currentStationIds = new Set(stations.map((s) => s.id));
    for (const [id, el] of stationContainersRef.current.entries()) {
      if (!currentStationIds.has(id)) {
        el.remove();
        stationContainersRef.current.delete(id);
        hasChanges = true;
      }
    }

    for (const st of stations) {
      if (!stationContainersRef.current.has(st.id)) {
        const el = document.createElement("div");
        el.className = "station-marker-root select-none pointer-events-auto";
        new maplibregl.Marker({ element: el }).setLngLat([st.lng, st.lat]).addTo(map);
        stationContainersRef.current.set(st.id, el);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setMarkerRevision((r) => r + 1);
    }
  }, [stations, markersReady]);

  // Gateway Kapsama Çevrelerini ve Marker'ları Güncelle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersReady) return;

    const source = map.getSource("gateways-coverage") as maplibregl.GeoJSONSource | undefined;
    if (source) {
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
      source.setData({ type: "FeatureCollection", features: gatewayPolygons });
    }

    if (map.getLayer("gateways-coverage-fill")) {
      map.setLayoutProperty(
        "gateways-coverage-fill",
        "visibility",
        showGatewayCoverage ? "visible" : "none",
      );
    }
    if (map.getLayer("gateways-coverage-line")) {
      map.setLayoutProperty(
        "gateways-coverage-line",
        "visibility",
        showGatewayCoverage ? "visible" : "none",
      );
    }

    // Marker DOM container'larını senkronize et
    let hasChanges = false;
    const currentGwIds = new Set(gateways.map((g) => g.id));
    for (const [id, el] of gatewayContainersRef.current.entries()) {
      if (!currentGwIds.has(id)) {
        el.remove();
        gatewayContainersRef.current.delete(id);
        hasChanges = true;
      }
    }
    for (const gw of gateways) {
      if (!gatewayContainersRef.current.has(gw.id)) {
        const el = document.createElement("div");
        el.className = "gateway-marker-root select-none pointer-events-auto";
        new maplibregl.Marker({ element: el }).setLngLat([gw.lng, gw.lat]).addTo(map);
        gatewayContainersRef.current.set(gw.id, el);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setMarkerRevision((r) => r + 1);
    }
  }, [gateways, markersReady, showGatewayCoverage]);

  // 2. Yangın Yayılım Konisini Güncelle (3B Rothermel / Huygens Çoklu Horizon)
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const coneSource = map.getSource("fire-spread-cone") as maplibregl.GeoJSONSource | undefined;
    const windSource = map.getSource("wind-vector") as maplibregl.GeoJSONSource | undefined;

    if (!coneSource || !windSource) return;

    const targetNodeId = fireSpread?.activeFireNodeId ?? activeFireNodeId;

    if (!targetNodeId) {
      coneSource.setData({ type: "FeatureCollection", features: [] });
      windSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const fireStation = stations.find((s) => s.id === targetNodeId);
    if (!fireStation) return;

    // Eğer backend'den hesaplanmış Rothermel çoklu zonları geldiyse onları çiz:
    // (Büyük zonlar altta, küçük zonlar üstte kalsın diye azalan sıralama: 60m -> 30m -> 15m)
    if (fireSpread?.zones && fireSpread.zones.length > 0) {
      const sortedZones = [...fireSpread.zones].sort((a, b) => b.horizonMin - a.horizonMin);
      const features = sortedZones.map((zone) => ({
        type: "Feature" as const,
        properties: {
          horizonMin: zone.horizonMin,
          level: zone.level,
          color: zone.color,
          opacity: zone.horizonMin === 15 ? 0.35 : zone.horizonMin === 30 ? 0.22 : 0.12,
          areaHectares: zone.areaHectares,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [zone.polygon],
        },
      }));
      coneSource.setData({ type: "FeatureCollection", features });
    } else {
      // Geriye dönük istemci taraflı elips üretimi
      const coneFeature = generateHuygensSpreadPolygon(
        fireStation.lat,
        fireStation.lng,
        windDirection,
        windSpeed,
        25,
      );
      coneSource.setData({ type: "FeatureCollection", features: [coneFeature] });
    }

    // Rüzgâr yön çizgisi
    const effectiveWindDir = fireSpread?.windDirectionDeg ?? windDirection;
    const rad = ((90 - effectiveWindDir) * Math.PI) / 180;
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
  }, [activeFireNodeId, fireSpread, windDirection, windSpeed, stations]);

  // 3. Tüm İstasyonların 3D Rüzgâr Vektörlerini Güncelle ve Göster/Gizle
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const windSource = map.getSource("all-stations-wind") as maplibregl.GeoJSONSource | undefined;
    if (!windSource) return;

    const isVisible = showStationVectors || showWindLayer;
    if (!isVisible) {
      map.setLayoutProperty("all-stations-wind-line", "visibility", "none");
      return;
    }

    map.setLayoutProperty("all-stations-wind-line", "visibility", "visible");

    // İstasyon telemetrilerindeki rüzgâr hız ve yönlerine göre vektör üret
    const features = stations
      .map((st) => {
        const tel = telemetries.get(st.id);
        const stWindSpeed = tel?.windSpeed ?? windSpeed;
        const stWindDir = tel?.windDirection ?? windDirection;

        return generateWindVectorFeature(st.lat, st.lng, st.id, stWindDir, stWindSpeed);
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    windSource.setData({
      type: "FeatureCollection",
      features,
    });
  }, [showStationVectors, showWindLayer, stations, telemetries, windDirection, windSpeed]);

  // 4. Kamera Odaklanma (Sinematik Geçiş)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraFocus) return;

    map.flyTo({
      center: [cameraFocus.lng, cameraFocus.lat],
      zoom: 14.8,
      pitch: 65,
      bearing: map.getBearing(),
      duration: 1500,
      essential: true,
    });
  }, [cameraFocus]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-zinc-950">
      {/* 4. Rüzgâr Parçacık Akış Katmanı (Windy Streamline Canvas) */}
      <WindParticleLayer
        map={activeMap}
        stations={stations}
        telemetries={telemetries}
        regionalWindDirection={windDirection}
        regionalWindSpeed={windSpeed}
        activeFireNodeId={activeFireNodeId}
        visible={Boolean(showWindParticles)}
      />

      {/* 5. React DOM Markers */}
      {markersReady && (
        <>
          {/* A. Sensör Düğümleri */}
          {stations.map((st) => {
            const container = stationContainersRef.current.get(st.id);
            if (!container) return null;

            const rsk = risks.get(st.id);
            const isSelected = st.id === selectedStationId;
            const isCovered = isStationCovered(st.lat, st.lng, gateways);
            const riskLevel = rsk?.level ?? "green";
            const isFire = riskLevel === "red";
            const isSmoldering = riskLevel === "yellow";

            return createPortal(
              <button
                key={st.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (adminMode === "delete") {
                    onDeleteRequest?.({ type: "node", id: st.id, name: st.name });
                  } else {
                    onSelectStation(st.id);
                  }
                }}
                className={`group relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none ${
                  isSelected ? "z-30" : "z-10"
                }`}
              >
                {/* Siber-Fiziksel İstasyon Düğümü (Node İkonu) */}
                <div
                  className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
                    !isCovered
                      ? "bg-zinc-950 border-2 border-dashed border-zinc-600 text-zinc-500 opacity-80"
                      : isFire
                        ? "bg-rose-950 border-2 border-rose-500 text-rose-200"
                        : isSmoldering
                          ? "bg-amber-950 border-2 border-amber-500 text-amber-200"
                          : st.source === "wokwi"
                            ? "bg-sky-950 border-2 border-sky-400 text-sky-200"
                            : "bg-zinc-950 border border-emerald-500/80 text-emerald-400"
                  } ${isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950" : ""}`}
                >
                  {/* Düğüm Dış Radar Dalgaları */}
                  {(isFire || isSmoldering) && (
                    <span
                      className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                        isFire ? "bg-rose-500" : "bg-amber-500"
                      }`}
                    />
                  )}

                  {/* 4 Eksenli Mikro Düğüm Çentikleri */}
                  <span className="absolute -top-0.5 w-0.5 h-1 bg-zinc-600/80" />
                  <span className="absolute -bottom-0.5 w-0.5 h-1 bg-zinc-600/80" />
                  <span className="absolute -left-0.5 h-0.5 w-1 bg-zinc-600/80" />
                  <span className="absolute -right-0.5 h-0.5 w-1 bg-zinc-600/80" />

                  {/* LED Sensör Çekirdeği */}
                  <span
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      !isCovered
                        ? "bg-zinc-500"
                        : isFire
                          ? "bg-rose-500"
                          : isSmoldering
                            ? "bg-amber-400"
                            : st.source === "wokwi"
                              ? "bg-sky-400"
                              : "bg-emerald-400"
                    }`}
                  />
                </div>

                {/* İstasyon Numarası Etiketi */}
                <span className="mt-1 px-1.5 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono font-bold text-zinc-100 shadow-sm flex items-center gap-1 whitespace-nowrap">
                  <span>#{st.id}</span>
                  {st.source === "wokwi" && (
                    <span className="text-[10px] text-sky-400 font-semibold">[WOKWI]</span>
                  )}
                </span>
                {!isCovered && (
                  <span className="mt-0.5 px-1 py-0.2 bg-zinc-900 border border-dashed border-zinc-600 rounded text-[9px] font-mono font-bold text-zinc-400 whitespace-nowrap tracking-wider shadow-sm">
                    KAPSAMA DIŞI
                  </span>
                )}
              </button>,
              container,
            );
          })}

          {/* B. LoRaWAN Ağ Geçidi Kuleleri */}
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
                  if (adminMode === "delete") {
                    onDeleteRequest?.({ type: "gateway", id: gw.id, name: gw.name });
                  } else {
                    onSelectGateway(gw.id);
                  }
                }}
                className={`group relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none ${
                  isSelected ? "z-30" : "z-20"
                }`}
              >
                {/* Kule / Yayın İkonu */}
                <div
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950 border border-sky-400 text-sky-400 shadow-md transition-all duration-200 ${
                    isSelected ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-zinc-950" : ""
                  }`}
                >
                  <RadioTower className="h-4 w-4" />
                  <span className="absolute inset-0 rounded-full animate-ping opacity-35 bg-sky-400" />
                </div>

                <span className="mt-1 px-1.5 py-0.5 bg-zinc-950 border border-sky-800 rounded text-xs font-mono font-bold text-sky-300 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
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

function isStationCovered(lat: number, lng: number, gws: readonly GatewayInfo[]): boolean {
  if (gws.length === 0) return false;
  for (const gw of gws) {
    const dLat = (lat - gw.lat) * 111320;
    const avgLatRad = (((lat + gw.lat) / 2) * Math.PI) / 180;
    const dLng = (lng - gw.lng) * 111320 * Math.cos(avgLatRad);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist <= gw.radiusMeters) return true;
  }
  return false;
}
