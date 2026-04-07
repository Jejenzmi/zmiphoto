import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Monitor, Camera, Wifi, WifiOff, RefreshCw,
  Play, Pause, AlertTriangle, CheckCircle2, Clock, Loader2,
  Image as ImageIcon, Zap, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import OperatorSidebar from "@/components/OperatorSidebar";

const OperatorDashboard = () => {
  const { user, venueIds } = useAuth();
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("monitor");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      let kioskQuery = supabase.from("kiosks").select("*").order("kiosk_code");
      if (venueIds.length > 0) {
        kioskQuery = kioskQuery.in("venue_id", venueIds);
      }
      const { data: kioskData } = await kioskQuery;
      setKiosks(kioskData || []);

      const kioskIds = (kioskData || []).map(k => k.id);
      if (kioskIds.length > 0) {
        const { data: sessionData } = await supabase
          .from("photo_sessions").select("*")
          .order("created_at", { ascending: false }).limit(50);
        setSessions(sessionData || []);
      }
    } catch (e: any) {
      toast.error("Gagal memuat data", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [venueIds]);

  // Auto-refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [venueIds]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Data diperbarui");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onlineKiosks = kiosks.filter(k => k.status === "online");
  const offlineKiosks = kiosks.filter(k => k.status !== "online");
  const todaySessions = sessions.filter(s =>
    new Date(s.created_at).toDateString() === new Date().toDateString()
  );

  const getTimeSince = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <OperatorSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border p-4 flex items-center gap-4 shrink-0">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Dashboard Operator</h1>
            <p className="text-xs text-muted-foreground">Monitoring & operasional kiosk</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Ringkasan Status */}
          {activeSection === "monitor" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Kiosk Online", value: onlineKiosks.length, icon: Wifi, color: "text-primary" },
                  { label: "Kiosk Offline", value: offlineKiosks.length, icon: WifiOff, color: "text-destructive" },
                  { label: "Sesi Hari Ini", value: todaySessions.length, icon: Camera, color: "text-accent" },
                  { label: "Total Kiosk", value: kiosks.length, icon: Monitor, color: "text-foreground" },
                ].map((stat, i) => (
                  <div key={i} className="glass-card rounded-xl p-4">
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Status Kiosk Real-time */}
              <div className="glass-card rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Status Kiosk Real-time
                </h2>
                <div className="space-y-3">
                  {kiosks.map((k) => {
                    const isOnline = k.status === "online";
                    const lastPing = k.last_ping ? getTimeSince(k.last_ping) : "Tidak pernah";
                    return (
                      <div key={k.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        isOnline ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-destructive"}`} />
                          <div>
                            <span className="text-sm font-medium text-foreground">{k.kiosk_code}</span>
                            <span className="text-xs text-muted-foreground ml-2">— {k.location_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-xs font-medium ${isOnline ? "text-primary" : "text-destructive"}`}>
                              {isOnline ? "Online" : "Offline"}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {lastPing}
                            </div>
                          </div>
                          {!isOnline && (
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {kiosks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Belum ada kiosk yang terhubung</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Sesi Foto Terbaru */}
          {(activeSection === "monitor" || activeSection === "sessions") && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Sesi Foto Terbaru
              </h2>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada sesi foto</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 20).map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {s.final_image_url ? (
                            <img src={s.final_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-mono text-foreground">{s.short_code}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {s.filter_applied || "Original"} • {s.raw_image_urls?.length || 0} foto
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panduan Cepat Operator */}
          {activeSection === "panduan" && (
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Panduan Cepat Operator
              </h2>
              {[
                { title: "Menyalakan Kiosk", steps: ["Nyalakan Mini PC dan monitor", "Pastikan koneksi internet aktif (WiFi/LAN/LTE)", "Buka browser, akses halaman kiosk", "Pastikan status kiosk berubah menjadi 'Online'"] },
                { title: "Menghubungkan Kamera", steps: ["Nyalakan kamera Canon, set ke mode M/P", "Hubungkan kabel USB ke Mini PC", "Jalankan camera-bridge: node bridge-auto.js", "Cek notifikasi '📷 Canon DSLR terdeteksi!'"] },
                { title: "Menghubungkan Printer", steps: ["Nyalakan printer foto (DNP DS-RX1HS)", "Hubungkan USB ke Mini PC", "Jalankan print-bridge: node bridge-auto.js", "Cek status printer di halaman ini"] },
                { title: "Troubleshooting", steps: ["Kiosk offline → Cek koneksi internet", "Kamera tidak terdeteksi → Cabut-pasang USB, restart bridge", "Printer error → Cek kertas dan ribbon", "Layar blank → Refresh browser (F5)"] },
              ].map((section, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">{i + 1}. {section.title}</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    {section.steps.map((step, j) => (
                      <li key={j} className="text-xs text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OperatorDashboard;
