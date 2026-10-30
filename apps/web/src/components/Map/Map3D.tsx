import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type React from "react";
import { useEffect, useRef } from "react";
import { GATEWAYS, REGION_CENTER } from "../../services/mockEngine";
import type { SensorStation, TelemetryReading } from "../../types/simulation";
import { generateHuygensSpreadPolygon } from "./spreadCone";

interface Map3DProps {
  stations: readonly SensorStation[];
  telemetries: Map<number, TelemetryReading>;
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  showWindLayer: boolean;
  cameraFocusId: number | null;
  selectedStationId: number | null;
  onSelectStation: (id: number) => void;
}

export const Map3D: React.FC<Map3DProps> = ({
  stations,
  telemetries,
  activeFireNodeId,
  windDirection,
  windSpeed,
  showWindLayer,
  cameraFocusId,
  selectedStationId,
  onSelectStation,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelectStation);

  useEffect(() => {
    onSelectRef.current = onSelectStation;
  }, [onSelectStation]);

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
      const gatewayPolygons = GATEWAYS.map((gw) => {
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

      // 2. Gateway Radyo Kulesi Noktaları ve Etiketleri
      const gatewayPoints = GATEWAYS.map((gw) => ({
        type: "Feature" as const,
        properties: { name: gw.name, id: gw.id },
        geometry: { type: "Point" as const, coordinates: [gw.lng, gw.lat] },
      }));

      map.addSource("gateways-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: gatewayPoints },
      });

      map.addLayer({
        id: "gateways-tower-glow",
        type: "circle",
        source: "gateways-points",
        paint: {
          "circle-radius": 14,
          "circle-color": "#0284c7",
          "circle-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "gateways-tower-core",
        type: "circle",
        source: "gateways-points",
        paint: {
          "circle-radius": 6.5,
          "circle-color": "#38bdf8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "gateways-tower-label",
        type: "symbol",
        source: "gateways-points",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10.5,
          "text-offset": [0, -1.8],
          "text-anchor": "bottom",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#7dd3fc",
          "text-halo-color": "#09090b",
          "text-halo-width": 2,
        },
      });

      // 3. Huygens Yangın Yayılım Konisi
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

      // 4. Alarm Odaklı Rüzgâr Vektör Çizgisi
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

      // 5. Tüm 31 İstasyonun Rüzgâr Vektörleri Katmanı (Açılıp Kapanabilir)
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
          "line-color": "#f59e0b",
          "line-width": 1.5,
          "line-opacity": 0.75,
        },
      });

      // 6. 31 İstasyon Kaynağı
      map.addSource("stations-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Dış Halka / Pulsing Glow
      map.addLayer({
        id: "stations-glow",
        type: "circle",
        source: "stations-source",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "riskLevel"], "fire"],
            18,
            ["==", ["get", "riskLevel"], "smoldering"],
            14,
            8,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "riskLevel"], "fire"],
            "#ef4444",
            ["==", ["get", "riskLevel"], "smoldering"],
            "#f59e0b",
            "#10b981",
          ],
          "circle-opacity": [
            "case",
            ["==", ["get", "riskLevel"], "fire"],
            0.4,
            ["==", ["get", "riskLevel"], "smoldering"],
            0.35,
            0.15,
          ],
        },
      });

      // İç Katı Daire (Pillar Core)
      map.addLayer({
        id: "stations-core",
        type: "circle",
        source: "stations-source",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 9, ["get", "isHardware"], 7, 5.5],
          "circle-color": [
            "case",
            ["==", ["get", "riskLevel"], "fire"],
            "#ef4444",
            ["==", ["get", "riskLevel"], "smoldering"],
            "#f59e0b",
            ["get", "isHardware"],
            "#38bdf8",
            "#10b981",
          ],
          "circle-stroke-width": ["case", ["get", "selected"], 2.5, ["get", "isHardware"], 2, 1],
          "circle-stroke-color": ["case", ["get", "isHardware"], "#fef08a", "#ffffff"],
        },
      });

      // İstasyon Etiketi (#ID)
      map.addLayer({
        id: "stations-label",
        type: "symbol",
        source: "stations-source",
        layout: {
          "text-field": [
            "case",
            ["get", "isHardware"],
            ["concat", "#", ["get", "id"], " [WOKWI]"],
            ["concat", "#", ["get", "id"]],
          ],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "text-offset": [0, -1.6],
          "text-anchor": "bottom",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#e4e4e7",
          "text-halo-color": "#09090b",
          "text-halo-width": 1.5,
        },
      });

      // Tıklama Olayı
      map.on("click", "stations-core", (e) => {
        if (!e.features || e.features.length === 0) return;
        const id = e.features[0].properties?.id;
        if (id !== undefined) onSelectRef.current(Number(id));
      });

      map.on("mouseenter", "stations-core", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations-core", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. İstasyon Verilerini Güncelle (GeoJSON)
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const source = map.getSource("stations-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = stations.map((st) => {
      const tel = telemetries.get(st.id);
      return {
        type: "Feature" as const,
        properties: {
          id: st.id,
          name: st.name,
          elevation: st.elevation,
          isHardware: Boolean(st.isHardware),
          riskLevel: tel?.riskLevel ?? "normal",
          temp: tel?.temperature ?? 24,
          co: tel?.co ?? 8,
          selected: st.id === selectedStationId,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [st.lng, st.lat],
        },
      };
    });

    source.setData({
      type: "FeatureCollection",
      features,
    });
  }, [stations, telemetries, selectedStationId]);

  // 3. Yangın Yayılım Konisini ve Rüzgâr Oku Çizimini Güncelle
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
      25, // 25 dakikalık yayılım tahmini
    );
    coneSource.setData({ type: "FeatureCollection", features: [coneFeature] });

    // Rüzgâr yön çizgisi (1.8 km ileriye doğru uzanan vektör)
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

  // 4. Tüm İstasyonların Rüzgâr Vektörlerini Güncelle ve Göster/Gizle
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

    // Her istasyon için telemetrisindeki rüzgâr açısıyla 450 metrelik yön çizgisi
    const windFeatures = stations.map((st) => {
      const tel = telemetries.get(st.id);
      const dir = tel?.windDirection ?? windDirection;
      const speed = tel?.windSpeed ?? windSpeed;
      const rad = ((90 - dir) * Math.PI) / 180;
      const lenMeters = 300 + speed * 25; // Hıza göre uzayan ok
      const endLng =
        st.lng + (lenMeters * Math.cos(rad)) / (111320 * Math.cos((st.lat * Math.PI) / 180));
      const endLat = st.lat + (lenMeters * Math.sin(rad)) / 111320;

      return {
        type: "Feature" as const,
        properties: { id: st.id, speed },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [st.lng, st.lat],
            [endLng, endLat],
          ],
        },
      };
    });

    allWindSource.setData({
      type: "FeatureCollection",
      features: windFeatures,
    });
  }, [showWindLayer, stations, telemetries, windDirection, windSpeed]);

  // 5. Kamera Odaklanma (Sinematik flyTo)
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

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-zinc-950" />;
};
