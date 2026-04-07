import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Monitor, Camera, DollarSign, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import SuperadminSidebar from "@/components/SuperadminSidebar";

const SuperadminDashboard = () => {
  const { signOut } = useAuth();
  const [venues, setVenues] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [revenueSplits, setRevenueSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const load = async () => {
      const [
        { data: v }, { data: k }, { data: t }, { data: s }, { data: rs }
      ] = await Promise.all([
        supabase.from("venues").select("*").order("created_at", { ascending: false }),
        supabase.from("kiosks").select("*, venues(name)").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("photo_sessions").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("revenue_splits").select("*, venues(name)").order("venue_id"),
      ]);
      setVenues(v || []);
      setKiosks(k || []);
      setTransactions(t || []);
      setSessions(s || []);
      setRevenueSplits(rs || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = transactions.filter(t => t.payment_status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const onlineKiosks = kiosks.filter(k => k.status === "online").length;
  const todaySessions = sessions.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length;

  const revenueByVenue: Record<string, any[]> = {};
  revenueSplits.forEach(rs => {
    const vName = (rs.venues as any)?.name || rs.venue_id;
    if (!revenueByVenue[vName]) revenueByVenue[vName] = [];
    revenueByVenue[vName].push(rs);
  });

  return (
    <div className="min-h-screen bg-background flex">
      <SuperadminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">PT Zen Multimedia Indonesia</h1>
              <p className="text-xs text-muted-foreground">Dashboard Superadmin • Lihat Semua</p>
            </div>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
            Logout
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {activeSection === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Venue", value: venues.length, icon: Building2, color: "text-primary" },
                  { label: "Kiosk Online", value: `${onlineKiosks}/${kiosks.length}`, icon: Monitor, color: "text-accent" },
                  { label: "Sesi Hari Ini", value: todaySessions, icon: Camera, color: "text-primary" },
                  { label: "Total Revenue", value: `Rp ${totalRevenue.toLocaleString("id-ID")}`, icon: DollarSign, color: "text-accent" },
                ].map((stat, i) => (
                  <div key={i} className="glass-card rounded-xl p-4">
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Transaksi Terbaru
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Tanggal</th>
                        <th className="text-left py-2 font-medium">Jumlah</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Metode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 15).map(t => (
                        <tr key={t.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 text-muted-foreground">{format(new Date(t.created_at), "dd/MM/yy HH:mm")}</td>
                          <td className="py-2 font-medium text-foreground">Rp {t.amount.toLocaleString("id-ID")}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${t.payment_status === "paid" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                              {t.payment_status}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground uppercase text-xs">{t.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeSection === "venues" && (
            <>
              <div className="glass-card rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Semua Venue
                </h2>
                <div className="space-y-3">
                  {venues.map(v => {
                    const vKiosks = kiosks.filter(k => k.venue_id === v.id);
                    const vOnline = vKiosks.filter(k => k.status === "online").length;
                    return (
                      <div key={v.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{v.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {v.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                            <span className="capitalize">{v.type}</span>
                            {v.address && <span>{v.address}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-foreground">{vOnline}/{vKiosks.length} kiosk</div>
                          <div className="text-[10px] text-muted-foreground">online</div>
                        </div>
                      </div>
                    );
                  })}
                  {venues.length === 0 && <p className="text-sm text-muted-foreground">Belum ada venue</p>}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Semua Kiosk
                </h2>
                <div className="space-y-2">
                  {kiosks.map(k => (
                    <div key={k.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${k.status === "online" ? "bg-primary" : "bg-destructive"}`} />
                        <div>
                          <span className="text-sm font-medium text-foreground">{k.kiosk_code}</span>
                          <span className="text-xs text-muted-foreground ml-2">{k.location_name}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{(k.venues as any)?.name || "—"}</div>
                    </div>
                  ))}
                  {kiosks.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kiosk</p>}
                </div>
              </div>
            </>
          )}

          {activeSection === "revenue" && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Revenue Split per Venue
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Pembagian revenue sesuai kontrak per venue (diatur oleh Admin)</p>
              {Object.keys(revenueByVenue).length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada konfigurasi revenue split</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(revenueByVenue).map(([venueName, splits]) => (
                    <div key={venueName} className="border border-border rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">{venueName}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {splits.map(s => (
                          <div key={s.id} className="bg-muted/50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-primary">{Number(s.percentage)}%</div>
                            <div className="text-xs text-muted-foreground capitalize">{s.role_name}</div>
                            {s.notes && <div className="text-[10px] text-muted-foreground/70 mt-1">{s.notes}</div>}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-xs text-muted-foreground">
                          Total: {splits.reduce((sum: number, s: any) => sum + Number(s.percentage), 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SuperadminDashboard;
