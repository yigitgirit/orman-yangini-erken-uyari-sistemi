import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Battery,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Download,
  Filter,
  Flame,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchHistoricalArchive, type HistoricalTelemetryRow } from "../../services/archiveService";

interface HistoricalArchiveViewProps {
  onBackToMap: () => void;
  onSelectStationOnMap: (stationId: number) => void;
  availableStations?: readonly { id: number; name: string }[];
}

export const HistoricalArchiveView: React.FC<HistoricalArchiveViewProps> = ({
  onBackToMap,
  onSelectStationOnMap,
  availableStations = [],
}) => {
  const [data, setData] = useState<HistoricalTelemetryRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtre ve Sayfalama Durumları
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [timePreset, setTimePreset] = useState<"1h" | "6h" | "24h" | "all">("all");
  const [sortBy, setSortBy] = useState<string>("received_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Zaman aralığı hesaplayıcı
  const dateRange = useMemo(() => {
    if (timePreset === "all") return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const hours = timePreset === "1h" ? 1 : timePreset === "6h" ? 6 : 24;
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timePreset]);

  // Veri çekme fonksiyonu
  const loadArchive = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchHistoricalArchive({
        nodeId: selectedNodeId ?? undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: pageSize,
        offset: pageIndex * pageSize,
        sortBy,
        sortOrder,
      });
      setData(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("[HistoricalArchiveView] Sorgu hatası:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedNodeId,
    dateRange.startDate,
    dateRange.endDate,
    pageSize,
    pageIndex,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  // Arama filtresi (client-side hızlı arama)
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (row) =>
        row.nodeName.toLowerCase().includes(term) ||
        row.nodeId.toString().includes(term) ||
        row.receivedAt.includes(term),
    );
  }, [data, searchTerm]);

  // CSV Dışa Aktarma
  const handleExportCsv = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "ID",
      "Düğüm ID",
      "İstasyon Adı",
      "Sıcaklık (°C)",
      "Bağıl Nem (%)",
      "CO (ppm)",
      "CO2 (ppm)",
      "VOC İndeksi",
      "PM2.5 (µg/m³)",
      "Batarya (%)",
      "Mod",
      "Bayraklar",
      "Zaman",
    ];
    const rows = filteredData.map((r) => [
      r.id,
      r.nodeId,
      `"${r.nodeName}"`,
      r.temperature ?? "",
      r.humidity ?? "",
      r.co ?? "",
      r.co2 ?? "",
      r.vocIndex ?? "",
      r.pm25 ?? "",
      r.battery ?? "",
      r.mode === 1 ? "Alarm" : "Normal",
      r.flags,
      `"${r.receivedAt}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pyroseco_telemetri_arsiv_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sıralama Değiştirici
  const handleSort = useCallback((columnKey: string) => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === columnKey) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("desc");
      }
      return columnKey;
    });
    setPageIndex(0);
  }, []);

  // TanStack Table Sütun Tanımları
  const columns = useMemo<ColumnDef<HistoricalTelemetryRow>[]>(
    () => [
      {
        accessorKey: "receivedAt",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("received_at")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>Zaman Damgası</span>
            {sortBy === "received_at" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-sky-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-sky-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const raw = info.getValue() as string;
          try {
            const d = new Date(raw);
            const timeStr = d.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const dateStr = d.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            return (
              <div className="font-mono text-xs pl-2">
                <span className="text-zinc-200 font-semibold">{timeStr}</span>
                <span className="text-zinc-500 text-[11px] block">{dateStr}</span>
              </div>
            );
          } catch {
            return <span className="font-mono text-xs text-zinc-400 pl-2">{raw}</span>;
          }
        },
      },
      {
        accessorKey: "nodeId",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("node_id")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>İstasyon</span>
            {sortBy === "node_id" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-sky-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-sky-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2 pl-2">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold bg-zinc-900 border-zinc-800 text-sky-400 shrink-0"
              >
                #{row.nodeId}
              </Badge>
              <span
                className="text-xs text-zinc-300 font-medium truncate max-w-[140px]"
                title={row.nodeName}
              >
                {row.nodeName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "temperature",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("temperature")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>Sıcaklık</span>
            {sortBy === "temperature" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-rose-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          const isHot = val > 42;
          const isWarm = val > 35;
          return (
            <span
              className={`font-mono font-semibold text-xs pl-2 ${
                isHot ? "text-rose-400" : isWarm ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {val.toFixed(1)}°C
            </span>
          );
        },
      },
      {
        accessorKey: "humidity",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("humidity")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>Nem</span>
            {sortBy === "humidity" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-sky-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-sky-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          const isCriticalDry = val < 15;
          return (
            <span
              className={`font-mono text-xs pl-2 ${
                isCriticalDry ? "text-rose-400 font-bold" : "text-sky-300"
              }`}
            >
              %{Math.round(val)}
            </span>
          );
        },
      },
      {
        accessorKey: "co",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("co")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>CO Gazı</span>
            {sortBy === "co" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          const isAlert = val > 5;
          return (
            <span
              className={`font-mono text-xs pl-2 ${
                isAlert ? "text-amber-400 font-bold animate-pulse" : "text-zinc-300"
              }`}
            >
              {val.toFixed(1)} ppm
            </span>
          );
        },
      },
      {
        accessorKey: "co2",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("co2")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>CO₂</span>
            {sortBy === "co2" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          return (
            <span className="font-mono text-xs text-zinc-300 pl-2">{Math.round(val)} ppm</span>
          );
        },
      },
      {
        accessorKey: "pm25",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("pm25")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>PM2.5 Duman</span>
            {sortBy === "pm25" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-purple-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-purple-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          const isDense = val > 35;
          return (
            <span
              className={`font-mono text-xs pl-2 ${
                isDense ? "text-purple-400 font-bold" : "text-zinc-400"
              }`}
            >
              {Math.round(val)} µg/m³
            </span>
          );
        },
      },
      {
        accessorKey: "battery",
        header: () => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSort("battery")}
            className="h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 font-semibold text-xs gap-1.5"
          >
            <span>Batarya</span>
            {sortBy === "battery" ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
            )}
          </Button>
        ),
        cell: (info) => {
          const val = info.getValue() as number | null;
          if (val === null || val === undefined)
            return <span className="text-zinc-600 pl-2">-</span>;
          const isLow = val < 20;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs pl-2">
              <Battery
                className={`h-3.5 w-3.5 ${
                  isLow ? "text-rose-400" : val > 60 ? "text-emerald-400" : "text-amber-400"
                }`}
              />
              <span className={isLow ? "text-rose-400 font-bold" : "text-zinc-300"}>
                %{Math.round(val)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "mode",
        header: () => <span className="text-xs font-semibold text-zinc-300 px-2">Yayın Modu</span>,
        cell: (info) => {
          const isAlert = info.getValue() === 1;
          return isAlert ? (
            <Badge
              variant="destructive"
              className="gap-1 font-bold bg-rose-950/80 text-rose-300 border-rose-800"
            >
              <Flame className="h-3 w-3 text-rose-400 animate-pulse" />
              Alarm (3s)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 font-medium bg-zinc-900 text-zinc-400 border-zinc-800"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Normal (60s)
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="text-right block pr-4 text-xs font-semibold text-zinc-300">İşlem</span>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-right pr-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectStationOnMap(row.nodeId);
                  onBackToMap();
                }}
                className="h-7 px-2.5 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium gap-1"
                title="Bu istasyonu 3B harita üzerinde aç"
              >
                <MapPin className="h-3 w-3" />
                Harita
              </Button>
            </div>
          );
        },
      },
    ],
    [sortBy, sortOrder, onSelectStationOnMap, onBackToMap, handleSort],
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col overflow-hidden text-zinc-100 font-sans select-none antialiased">
      {/* Üst Başlık ve Hızlı Eylem Çubuğu */}
      <header className="h-14 px-4 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToMap}
            className="h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200 hover:text-zinc-100 text-xs font-semibold"
            title="3D Harita ve Canlı Operasyon Merkezine Dön"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Haritaya Dön
          </Button>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-950/80 border border-sky-800/60 text-sky-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Telemetri Arşivi
                <Badge
                  variant="outline"
                  className="font-mono text-zinc-400 font-normal bg-zinc-900 border-zinc-800"
                >
                  {totalCount.toLocaleString("tr-TR")} Kayıt
                </Badge>
              </h1>
            </div>
          </div>
        </div>

        {/* Sağ Üst Dışa Aktarma ve Yenileme Butonları */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadArchive}
            disabled={isLoading}
            className="h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 text-xs font-medium"
            title="Arşivi Yenile"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-sky-400" : ""}`} />
            <span className="hidden sm:inline">Yenile</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredData.length === 0}
            className="h-8 gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border-emerald-800/80 text-emerald-200 text-xs font-semibold"
            title="Görüntülenen Tabloyu CSV Olarak İndir"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV İndir</span>
          </Button>
        </div>
      </header>

      {/* Filtre ve Arama Kontrol Çubuğu (Shadcn Select ve Butonlar) */}
      <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Shadcn Select: İstasyon Filtresi */}
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedNodeId !== null ? String(selectedNodeId) : "all"}
              onValueChange={(val) => {
                setSelectedNodeId(val === "all" ? null : Number(val));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-[220px] bg-zinc-950 border-zinc-800 text-zinc-200 text-xs font-medium focus:ring-0 focus:ring-offset-0">
                <Filter className="h-3.5 w-3.5 text-zinc-500 mr-1.5 shrink-0" />
                <SelectValue placeholder="Tüm İstasyonlar (50 Düğüm)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs max-h-72">
                <SelectItem
                  value="all"
                  className="focus:bg-zinc-900 focus:text-zinc-100 cursor-pointer"
                >
                  Tüm İstasyonlar (50 Düğüm)
                </SelectItem>
                {availableStations.map((st) => (
                  <SelectItem
                    key={st.id}
                    value={String(st.id)}
                    className="focus:bg-zinc-900 focus:text-zinc-100 cursor-pointer"
                  >
                    #{st.id} - {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zaman Aralığı Butonları (Shadcn Buttons) */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs font-medium">
            <Button
              type="button"
              variant={timePreset === "1h" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setTimePreset("1h");
                setPageIndex(0);
              }}
              className="h-7 px-2.5 text-xs font-medium"
            >
              Son 1 Saat
            </Button>
            <Button
              type="button"
              variant={timePreset === "6h" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setTimePreset("6h");
                setPageIndex(0);
              }}
              className="h-7 px-2.5 text-xs font-medium"
            >
              Son 6 Saat
            </Button>
            <Button
              type="button"
              variant={timePreset === "24h" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setTimePreset("24h");
                setPageIndex(0);
              }}
              className="h-7 px-2.5 text-xs font-medium"
            >
              Son 24 Saat
            </Button>
            <Button
              type="button"
              variant={timePreset === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setTimePreset("all");
                setPageIndex(0);
              }}
              className="h-7 px-2.5 text-xs font-medium"
            >
              Tüm Kayıtlar
            </Button>
          </div>
        </div>

        {/* Hızlı Filtre Arama Kutusu ve Sayfa Boyutu Select */}
        <div className="flex items-center gap-2">
          {/* Shadcn Input: Tabloda Arama */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tabloda ara..."
              className="h-8 pl-8 pr-3 w-44 sm:w-56 bg-zinc-950 border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-zinc-700"
            />
          </div>

          {/* Shadcn Select: Sayfa Boyutu */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 hidden sm:inline">Göster:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-[72px] bg-zinc-950 border-zinc-800 text-zinc-200 font-mono text-xs focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                <SelectItem value="25" className="focus:bg-zinc-900 font-mono cursor-pointer">
                  25
                </SelectItem>
                <SelectItem value="50" className="focus:bg-zinc-900 font-mono cursor-pointer">
                  50
                </SelectItem>
                <SelectItem value="100" className="focus:bg-zinc-900 font-mono cursor-pointer">
                  100
                </SelectItem>
                <SelectItem value="200" className="focus:bg-zinc-900 font-mono cursor-pointer">
                  200
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Hata Uyarısı */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Veritabanı arşivine erişirken hata oluştu: {error}</span>
        </div>
      )}

      {/* Shadcn Table ve TanStack Table Gövdesi */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <Table className="w-full text-left border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-zinc-800 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 py-1 px-2 select-none whitespace-nowrap text-zinc-400"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="divide-y divide-zinc-900 text-xs">
            {isLoading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-sky-400" />
                    <p className="font-medium text-zinc-400">Arşiv kayıtları sorgulanıyor...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-16 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Database className="h-8 w-8 text-zinc-700" />
                    <p className="font-medium text-zinc-400">
                      Seçili filtrelere uygun kayıt bulunamadı.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-zinc-900/60 transition-colors border-b border-zinc-900/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Shadcn Pagination Alt Çubuğu */}
      <footer className="h-14 px-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Sayfa <strong className="text-zinc-200">{pageIndex + 1}</strong> /{" "}
            <strong className="text-zinc-200">{totalPages || 1}</strong>
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 text-[11px] hidden sm:inline">
            {totalCount > 0 ? pageIndex * pageSize + 1 : 0} -{" "}
            {Math.min((pageIndex + 1) * pageSize, totalCount)} /{" "}
            {totalCount.toLocaleString("tr-TR")} satır
          </span>
        </div>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="gap-1">
            {/* İlk Sayfa */}
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0 || isLoading}
                className="h-8 w-8 disabled:opacity-30 disabled:pointer-events-none"
                title="İlk Sayfa"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>

            {/* Önceki Sayfa */}
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                className={`h-8 cursor-pointer ${
                  pageIndex === 0 || isLoading ? "pointer-events-none opacity-30" : ""
                }`}
              />
            </PaginationItem>

            {/* Sayfa Butonları */}
            {pageIndex > 1 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink onClick={() => setPageIndex(0)} className="h-8 w-8 cursor-pointer">
                  1
                </PaginationLink>
              </PaginationItem>
            )}

            {pageIndex > 2 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationEllipsis className="h-8 w-8" />
              </PaginationItem>
            )}

            {pageIndex > 0 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink
                  onClick={() => setPageIndex(pageIndex - 1)}
                  className="h-8 w-8 cursor-pointer"
                >
                  {pageIndex}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink isActive className="h-8 w-8 cursor-default">
                {pageIndex + 1}
              </PaginationLink>
            </PaginationItem>

            {pageIndex < totalPages - 1 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink
                  onClick={() => setPageIndex(pageIndex + 1)}
                  className="h-8 w-8 cursor-pointer"
                >
                  {pageIndex + 2}
                </PaginationLink>
              </PaginationItem>
            )}

            {pageIndex < totalPages - 3 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationEllipsis className="h-8 w-8" />
              </PaginationItem>
            )}

            {pageIndex < totalPages - 2 && (
              <PaginationItem className="hidden sm:inline-block">
                <PaginationLink
                  onClick={() => setPageIndex(totalPages - 1)}
                  className="h-8 w-8 cursor-pointer"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Sonraki Sayfa */}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                className={`h-8 cursor-pointer ${
                  pageIndex >= totalPages - 1 || isLoading ? "pointer-events-none opacity-30" : ""
                }`}
              />
            </PaginationItem>

            {/* Son Sayfa */}
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPageIndex(totalPages - 1)}
                disabled={pageIndex >= totalPages - 1 || isLoading}
                className="h-8 w-8 disabled:opacity-30 disabled:pointer-events-none"
                title="Son Sayfa"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </footer>
    </div>
  );
};
