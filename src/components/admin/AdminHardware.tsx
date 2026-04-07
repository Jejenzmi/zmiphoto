import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wifi, WifiOff, Usb, Monitor, Printer, Camera, RefreshCw,
  Loader2, CheckCircle2, XCircle, AlertTriangle, Settings2, Zap, Globe, Save
} from "lucide-react";

interface BridgeStatus {
  connected: boolean;
  type: "usb" | "ip" | "none";
  name?: string;
  version?: string;
  latency?: number;
  error?: string;
}

interface HardwareConfig {
  camera_bridge_ip: string;
  camera_bridge_port: number;
  printer_bridge_ip: string;
  printer_bridge_port: number;
  camera_connection: "usb" | "ip" | "auto";
  printer_connection: "usb" | "ip" | "auto";
}

const DEFAULT_CONFIG: HardwareConfig = {
  camera_bridge_ip: "localhost",
  camera_bridge_port: 8080,
  printer_bridge_ip: "localhost",
  printer_bridge_port: 8081,
  camera_connection: "auto",
  printer_connection: "auto",
};

import CameraInstallGuide from "./CameraInstallGuide";

const AdminHardware = () => {
  const queryClient = useQueryClient();
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [config, setConfig] = useState<HardwareConfig>(DEFAULT_CONFIG);
  const [cameraPing, setCameraPing] = useState<BridgeStatus | null>(null);
  const [printerPing, setPrinterPing] = useState<BridgeStatus | null>(null);
  const [pinging, setPinging] = useState<"camera" | "printer" | "both" | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: kiosks, isLoading } = useQuery({
    queryKey: ["admin-kiosks-hw"],
    queryFn: async () => {
      const { data } = await supabase.from("kiosks").select("*").order("kiosk_code");
      return data || [];
    },
  });

  // Load config when kiosk selected
  useEffect(() => {
    if (!selectedKioskId || !kiosks) return;
    const kiosk = kiosks.find((k) => k.id === selectedKioskId);
    if (kiosk) {
      const dslr = kiosk.dslr_settings as any;
      if (dslr?.hardware_config) {
        setConfig({ ...DEFAULT_CONFIG, ...dslr.hardware_config });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    }
    setCameraPing(null);
    setPrinterPing(null);
  }, [selectedKioskId, kiosks]);

  const pingBridge = async (type: "camera" | "printer") => {
    const ip = type === "camera" ? config.camera_bridge_ip : config.printer_bridge_ip;
    const port = type === "camera" ? config.camera_bridge_port : config.printer_bridge_port;
    const url = `http://${ip}:${port}/status`;

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const latency = Date.now() - start;

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return {
          connected: true,
          type: (data.connectionType || "usb") as "usb" | "ip",
          name: data.deviceName || data.printerName || (type === "camera" ? "Camera Bridge" : "Print Bridge"),
          version: data.version || "1.0",
          latency,
        } as BridgeStatus;
      }
      return { connected: false, type: "none" as const, error: `HTTP ${resp.status}` };
    } catch (e: any) {
      return {
        connected: false,
        type: "none" as const,
        error: e.name === "AbortError" ? "Timeout (5s)" : "Tidak dapat terhubung",
      } as BridgeStatus;
    }
  };

  const handlePing = async (type: "camera" | "printer" | "both") => {
    setPinging(type);
    if (type === "camera" || type === "both") {
      const result = await pingBridge("camera");
      setCameraPing(result);
      if (result.connected) toast.success(`📷 Camera Bridge: ${result.name} (${result.latency}ms)`);
      else toast.error(`📷 Camera Bridge: ${result.error}`);
    }
    if (type === "printer" || type === "both") {
      const result = await pingBridge("printer");
      setPrinterPing(result);
      if (result.connected) toast.success(`🖨️ Printer Bridge: ${result.name} (${result.latency}ms)`);
      else toast.error(`🖨️ Printer Bridge: ${result.error}`);
    }
    setPinging(null);
  };

  const handleSave = async () => {
    if (!selectedKioskId) return;
    setSaving(true);
    const kiosk = kiosks?.find((k) => k.id === selectedKioskId);
    const existingDslr = (kiosk?.dslr_settings as any) || {};
    const newDslr = { ...existingDslr, hardware_config: config };

    const { error } = await supabase.from("kiosks").update({ dslr_settings: newDslr }).eq("id", selectedKioskId);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Konfigurasi hardware disimpan!");
      queryClient.invalidateQueries({ queryKey: ["admin-kiosks-hw"] });
    }
  };

  const StatusBadge = ({ status }: { status: BridgeStatus | null }) => {
    if (!status) return <span className="text-xs text-muted-foreground">Belum ditest</span>;
    if (status.connected) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Terhubung
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
        <XCircle className="w-3 h-3" /> {status.error}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" /> Hardware Kiosk
          </h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi Camera Bridge & Printer Bridge per kiosk — USB Plug & Play atau via IP
          </p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium bg-card hover:bg-accent transition-colors text-foreground"
        >
          <Camera className="w-4 h-4" />
          {showGuide ? "Tutup Panduan" : "Panduan Instalasi"}
        </button>
      </div>

      {showGuide && (
        <div className="glass-card rounded-xl p-6">
          <CameraInstallGuide />
        </div>
      )}

      {/* Kiosk Selector */}
      <div className="glass-card rounded-xl p-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Pilih Kiosk</label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {(kiosks || []).map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKioskId(k.id)}
                className={`flex items-center gap-2 p-3 rounded-lg text-left text-sm transition-all border ${
                  selectedKioskId === k.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-xs truncate">{k.kiosk_code}</div>
                  <div className="text-[10px] truncate opacity-70">{k.location_name}</div>
                </div>
                {k.status === "online" && <div className="w-2 h-2 rounded-full bg-primary shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedKioskId && (
        <>
          {/* Connection Mode Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Bridge */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" /> Camera Bridge
                </h3>
                <StatusBadge status={cameraPing} />
              </div>

              {/* Connection Type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Mode Koneksi</label>
                <div className="flex gap-2">
                  {(["auto", "usb", "ip"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setConfig({ ...config, camera_connection: mode })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                        config.camera_connection === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "auto" && <Zap className="w-3 h-3" />}
                      {mode === "usb" && <Usb className="w-3 h-3" />}
                      {mode === "ip" && <Globe className="w-3 h-3" />}
                      {mode === "auto" ? "Auto Detect" : mode === "usb" ? "USB" : "IP / WiFi"}
                    </button>
                  ))}
                </div>
              </div>

              {/* IP Config */}
              {(config.camera_connection === "ip" || config.camera_connection === "auto") && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">IP Address</label>
                    <input
                      value={config.camera_bridge_ip}
                      onChange={(e) => setConfig({ ...config, camera_bridge_ip: e.target.value })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Port</label>
                    <input
                      type="number"
                      value={config.camera_bridge_port}
                      onChange={(e) => setConfig({ ...config, camera_bridge_port: parseInt(e.target.value) || 8080 })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Ping details */}
              {cameraPing?.connected && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Device</span>
                    <span className="text-foreground font-medium">{cameraPing.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Koneksi</span>
                    <span className="text-foreground font-medium flex items-center gap-1">
                      {cameraPing.type === "usb" ? <Usb className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {cameraPing.type === "usb" ? "USB" : "IP/WiFi"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="text-foreground font-mono">{cameraPing.latency}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Version</span>
                    <span className="text-foreground font-mono">{cameraPing.version}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => handlePing("camera")}
                disabled={pinging === "camera" || pinging === "both"}
                className="w-full flex items-center justify-center gap-2 text-xs bg-primary/10 text-primary py-2 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {pinging === "camera" || pinging === "both" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test Koneksi Camera
              </button>
            </div>

            {/* Printer Bridge */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Printer className="w-4 h-4 text-accent" /> Printer Bridge
                </h3>
                <StatusBadge status={printerPing} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Mode Koneksi</label>
                <div className="flex gap-2">
                  {(["auto", "usb", "ip"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setConfig({ ...config, printer_connection: mode })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                        config.printer_connection === mode
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "auto" && <Zap className="w-3 h-3" />}
                      {mode === "usb" && <Usb className="w-3 h-3" />}
                      {mode === "ip" && <Globe className="w-3 h-3" />}
                      {mode === "auto" ? "Auto Detect" : mode === "usb" ? "USB" : "IP / WiFi"}
                    </button>
                  ))}
                </div>
              </div>

              {(config.printer_connection === "ip" || config.printer_connection === "auto") && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">IP Address</label>
                    <input
                      value={config.printer_bridge_ip}
                      onChange={(e) => setConfig({ ...config, printer_bridge_ip: e.target.value })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Port</label>
                    <input
                      type="number"
                      value={config.printer_bridge_port}
                      onChange={(e) => setConfig({ ...config, printer_bridge_port: parseInt(e.target.value) || 8081 })}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {printerPing?.connected && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Device</span>
                    <span className="text-foreground font-medium">{printerPing.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Koneksi</span>
                    <span className="text-foreground font-medium flex items-center gap-1">
                      {printerPing.type === "usb" ? <Usb className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {printerPing.type === "usb" ? "USB" : "IP/WiFi"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="text-foreground font-mono">{printerPing.latency}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Version</span>
                    <span className="text-foreground font-mono">{printerPing.version}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => handlePing("printer")}
                disabled={pinging === "printer" || pinging === "both"}
                className="w-full flex items-center justify-center gap-2 text-xs bg-accent/10 text-accent py-2 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {pinging === "printer" || pinging === "both" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test Koneksi Printer
              </button>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePing("both")}
              disabled={!!pinging}
              className="flex items-center gap-2 text-sm bg-muted text-foreground px-4 py-2.5 rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {pinging === "both" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test Semua
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Konfigurasi
            </button>
          </div>

          {/* Help section */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">📖 Panduan Koneksi Hardware</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-primary" /> USB Plug & Play
                </h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Hubungkan kamera DSLR / printer via kabel USB ke PC kiosk</li>
                  <li>Jalankan <code className="bg-muted px-1 py-0.5 rounded text-[11px]">camera-bridge</code> atau <code className="bg-muted px-1 py-0.5 rounded text-[11px]">print-bridge</code></li>
                  <li>Bridge akan auto-detect device yang terhubung</li>
                  <li>Set mode koneksi ke <strong>"Auto Detect"</strong> atau <strong>"USB"</strong></li>
                  <li>Klik "Test Koneksi" untuk verifikasi</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent" /> IP / WiFi
                </h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Pastikan PC bridge dan kiosk dalam satu jaringan</li>
                  <li>Jalankan bridge di PC dengan kamera/printer terhubung</li>
                  <li>Masukkan IP address PC bridge (contoh: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">192.168.1.100</code>)</li>
                  <li>Port default: <strong>8080</strong> (kamera), <strong>8081</strong> (printer)</li>
                  <li>Klik "Test Koneksi" untuk verifikasi</li>
                </ol>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground">
              <strong>💡 Tips:</strong> Gunakan mode <strong>"Auto Detect"</strong> untuk deteksi otomatis.
              Bridge akan cek USB terlebih dahulu, lalu fallback ke IP jika tidak ada perangkat USB.
              Untuk kiosk yang menggunakan LG Smart TV 32" sebagai display terpisah, pastikan TV terhubung ke jaringan yang sama.
            </div>
          </div>
        </>
      )}

      {!selectedKioskId && !isLoading && (
        <div className="text-center py-16">
          <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Pilih kiosk di atas untuk konfigurasi hardware</p>
        </div>
      )}
    </div>
  );
};

export default AdminHardware;
