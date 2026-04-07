import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Aperture, Save, Loader2, RefreshCw, Wifi, WifiOff, Settings2 } from "lucide-react";

interface DSLRSettings {
  iso: string;
  shutterspeed: string;
  aperture: string;
  whitebalance: string;
  imageQuality: string;
}

const ISO_OPTIONS = ["100", "200", "400", "800", "1600", "3200", "6400"];
const SHUTTER_OPTIONS = ["1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15", "1/8", "1/4", "1/2", "1"];
const APERTURE_OPTIONS = ["1.8", "2.0", "2.8", "3.5", "4.0", "5.6", "8.0", "11", "16", "22"];
const WB_OPTIONS = ["Auto", "Daylight", "Shade", "Cloudy", "Tungsten", "Fluorescent", "Flash", "Custom"];
const QUALITY_OPTIONS = ["RAW+JPEG", "RAW", "JPEG Fine", "JPEG Normal"];

const defaultSettings: DSLRSettings = {
  iso: "400",
  shutterspeed: "1/125",
  aperture: "5.6",
  whitebalance: "Auto",
  imageQuality: "RAW+JPEG",
};

const AdminCameraSettings = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);

  const { data: kiosks, isLoading } = useQuery({
    queryKey: ["admin-kiosks-camera"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kiosks")
        .select("id, kiosk_code, location_name, status, dslr_settings")
        .order("kiosk_code");
      return data || [];
    },
  });

  const getSettings = (kiosk: any): DSLRSettings => {
    const raw = kiosk.dslr_settings as any;
    return { ...defaultSettings, ...(raw || {}) };
  };

  const updateSetting = async (kioskId: string, field: keyof DSLRSettings, value: string) => {
    const kiosk = kiosks?.find((k) => k.id === kioskId);
    if (!kiosk) return;

    const current = getSettings(kiosk);
    const updated = { ...current, [field]: value };

    setSaving(kioskId);
    const { error } = await supabase
      .from("kiosks")
      .update({ dslr_settings: updated as any })
      .eq("id", kioskId);

    setSaving(null);

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-kiosks-camera"] });
    toast.success(`Setting ${field} diperbarui`);
  };

  const pushToKiosk = async (kioskId: string) => {
    const kiosk = kiosks?.find((k) => k.id === kioskId);
    if (!kiosk) return;

    setPushing(kioskId);
    const settings = getSettings(kiosk);

    try {
      // Try to push settings to the kiosk's camera bridge
      const resp = await fetch("http://localhost:8080/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (resp.ok) {
        toast.success(`⚡ Settings pushed ke ${kiosk.kiosk_code}!`);
      } else {
        toast.error("Kiosk bridge tidak merespons", {
          description: "Pastikan camera bridge berjalan di PC kiosk",
        });
      }
    } catch {
      toast.info("Settings tersimpan di database", {
        description: "Akan diterapkan saat kiosk sync berikutnya",
      });
    }
    setPushing(null);
  };

  const applyPreset = async (kioskId: string, preset: string) => {
    const presets: Record<string, DSLRSettings> = {
      indoor: { iso: "800", shutterspeed: "1/60", aperture: "3.5", whitebalance: "Fluorescent", imageQuality: "RAW+JPEG" },
      outdoor: { iso: "200", shutterspeed: "1/250", aperture: "8.0", whitebalance: "Daylight", imageQuality: "RAW+JPEG" },
      studio: { iso: "100", shutterspeed: "1/125", aperture: "5.6", whitebalance: "Flash", imageQuality: "RAW+JPEG" },
      lowlight: { iso: "3200", shutterspeed: "1/30", aperture: "1.8", whitebalance: "Auto", imageQuality: "JPEG Fine" },
    };

    const settings = presets[preset];
    if (!settings) return;

    setSaving(kioskId);
    const { error } = await supabase
      .from("kiosks")
      .update({ dslr_settings: settings as any })
      .eq("id", kioskId);
    setSaving(null);

    if (error) {
      toast.error("Gagal menerapkan preset");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-kiosks-camera"] });
    toast.success(`Preset "${preset}" diterapkan`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Aperture className="w-6 h-6 text-primary" /> Camera Settings
        </h1>
        <p className="text-sm text-muted-foreground">Kontrol ISO, shutter speed, aperture kamera DSLR remote</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {(kiosks || []).map((kiosk) => {
            const settings = getSettings(kiosk);
            const isOnline = kiosk.status === "online";

            return (
              <div key={kiosk.id} className="glass-card rounded-xl overflow-hidden">
                {/* Kiosk header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-success" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <span className="text-sm font-bold text-foreground">{kiosk.kiosk_code}</span>
                      <span className="text-xs text-muted-foreground ml-2">{kiosk.location_name}</span>
                    </div>
                    {saving === kiosk.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => pushToKiosk(kiosk.id)}
                      disabled={pushing === kiosk.id}
                      className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {pushing === kiosk.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Push ke Kiosk
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="px-4 pt-3 flex gap-2">
                  <span className="text-xs text-muted-foreground self-center mr-1">Preset:</span>
                  {[
                    { id: "indoor", label: "🏢 Indoor" },
                    { id: "outdoor", label: "☀️ Outdoor" },
                    { id: "studio", label: "📸 Studio" },
                    { id: "lowlight", label: "🌙 Low Light" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(kiosk.id, p.id)}
                      className="text-xs glass-card px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Settings grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
                  {/* ISO */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">ISO</label>
                    <select
                      value={settings.iso}
                      onChange={(e) => updateSetting(kiosk.id, "iso", e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ISO_OPTIONS.map((v) => (
                        <option key={v} value={v}>ISO {v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shutter Speed */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Shutter Speed</label>
                    <select
                      value={settings.shutterspeed}
                      onChange={(e) => updateSetting(kiosk.id, "shutterspeed", e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {SHUTTER_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}s</option>
                      ))}
                    </select>
                  </div>

                  {/* Aperture */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Aperture</label>
                    <select
                      value={settings.aperture}
                      onChange={(e) => updateSetting(kiosk.id, "aperture", e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {APERTURE_OPTIONS.map((v) => (
                        <option key={v} value={v}>f/{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* White Balance */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">White Balance</label>
                    <select
                      value={settings.whitebalance}
                      onChange={(e) => updateSetting(kiosk.id, "whitebalance", e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {WB_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Quality */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Quality</label>
                    <select
                      value={settings.imageQuality}
                      onChange={(e) => updateSetting(kiosk.id, "imageQuality", e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {QUALITY_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Current values summary */}
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded">ISO {settings.iso}</span>
                  <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded">{settings.shutterspeed}s</span>
                  <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded">f/{settings.aperture}</span>
                  <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded">WB: {settings.whitebalance}</span>
                  <span className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-1 rounded">{settings.imageQuality}</span>
                </div>
              </div>
            );
          })}

          {(!kiosks || kiosks.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Belum ada kiosk. Tambahkan di tab Mesin Kiosk.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCameraSettings;
