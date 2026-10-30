import type { SensorNode } from "@pyros/shared";
import { useCallback, useState } from "react";
import { GATEWAYS } from "../services/mockEngine";

export interface InspectorSelectionState {
  selectedStationId: number | null;
  isInspectorOpen: boolean;
  selectedGatewayId: number | null;
  isGatewayInspectorOpen: boolean;
  cameraFocus: { lat: number; lng: number } | null;
  selectStation: (id: number) => void;
  closeStation: () => void;
  selectGateway: (id: number) => void;
  closeGateway: () => void;
}

export function useInspectorSelection(nodes: readonly SensorNode[]): InspectorSelectionState {
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const [selectedGatewayId, setSelectedGatewayId] = useState<number | null>(null);
  const [isGatewayInspectorOpen, setIsGatewayInspectorOpen] = useState<boolean>(false);

  const [cameraFocus, setCameraFocus] = useState<{ lat: number; lng: number } | null>(null);

  const selectStation = useCallback(
    (id: number) => {
      setSelectedGatewayId(null);
      setIsGatewayInspectorOpen(false);
      setSelectedStationId(id);
      setIsInspectorOpen(true);

      const target = nodes.find((n) => n.id === id);
      if (target) {
        setCameraFocus({ lat: target.lat, lng: target.lng });
      }
    },
    [nodes],
  );

  const closeStation = useCallback(() => {
    setIsInspectorOpen(false);
  }, []);

  const selectGateway = useCallback((id: number) => {
    setSelectedStationId(null);
    setIsInspectorOpen(false);
    setSelectedGatewayId(id);
    setIsGatewayInspectorOpen(true);

    const targetGw = GATEWAYS.find((g) => g.id === id);
    if (targetGw) {
      setCameraFocus({ lat: targetGw.lat, lng: targetGw.lng });
    }
  }, []);

  const closeGateway = useCallback(() => {
    setIsGatewayInspectorOpen(false);
  }, []);

  return {
    selectedStationId,
    isInspectorOpen,
    selectedGatewayId,
    isGatewayInspectorOpen,
    cameraFocus,
    selectStation,
    closeStation,
    selectGateway,
    closeGateway,
  };
}
