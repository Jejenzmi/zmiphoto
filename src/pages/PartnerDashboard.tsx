import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Monitor, Camera, TrendingUp, Download, PieChart, DollarSign, FileText, ChevronDown, Image as ImageIcon, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { exportToCSV, exportToPDF } from "@/utils/reportExport";
import PartnerSidebar from "@/components/PartnerSidebar";

const PartnerDashboard = () => {
  const { user, venueIds } = useAuth();
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [venue, setVenue] = useState<any>(null);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [revenueSplits, setRevenueSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!user || venueIds.length === 0) { setLoading(false); return; }
    const loadVenues = async () => {
      const { data } = await supabase.from("venues").select("*").in("id", venueIds);
      setVenues(data || []);
      if (data && data.length > 0) setSelectedVenueId(data[0].id);
      setLoading(false);
    };
    loadVenues();
  }, [user, venueIds]);

  useEffect(() => {
    if (!selectedVenueId) return;
    const load = async () => {
      const selected = venues.find(v => v.id === selectedVenueId);
      setVenue(selected || null);
      const [{ data: kioskData }, { data: sessionData }, { data: rsData }] = await Promise.all([
        supabase.from("kiosks").select("*").eq("venue_id", selectedVenueId),
        supabase.from("photo_sessions").select("*").eq("venue_id", selectedVenueId).order("created_at", { ascending: false }).limit(100),
        supabase.from("revenue_splits").select("*").eq("venue_id", selectedVenueId),
      ]);
      setKiosks(kioskData || []);
      setSessions(sessionData || []);
      setRevenueSplits(rsData || []);
      const kioskIds = (kioskData || []).map(k => k.id);
      if (kioskIds.length > 0) {
        const { data: txData } = await supabase
          .from("transactions").select("*").in("kiosk_id", kioskIds)
          .order("created_at", { ascending: false }).limit(200);
        setTransactions(txData || []);
      } else {
        setTransactions([]);
      }
    };
    load();
  }, [selectedVenueId, venues]);

  const handleExport = (format: "csv" | "pdf") => {
    const [year, month] = exportMonth.split("-").map(Number);
    const paidTx = transactions.filter(t => t.payment_status === "paid");
    const monthTx = paidTx.filter(t => {
      const d = new Date(t.created_at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const partnerPercentage = Number(revenueSplits.find(rs => rs.role_name === "partner")?.percentage || 0);
    const headers = ["Tanggal", "Metode", "Revenue", "Partner Share", "Status"];
    const rows = monthTx.map(t => ({
      Tanggal: new Date(t.created_at).toLocaleDateString("id-ID"),
      Metode: t.payment_method,
      Revenue: `Rp ${t.amount.toLocaleString("id-ID")}`,
      "Partner Share": `Rp ${Math.round(t.amount * partnerPercentage / 100).toLocaleString("id-ID")}`,
      Status: t.payment_status,
    }));
    const totalRev = monthTx.reduce((a, t) => a + t.amount, 0);
    const totalShare = Math.round(totalRev * partnerPercentage / 100);
    const monthLabel = new Date(year, month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    if (format === "csv") {
      exportToCSV(headers, rows, `Laporan-Partner-${venue?.name}-${exportMonth}`);
      toast.success("CSV berhasil diunduh");
    } else {
      exportToPDF(
        `Laporan Revenue Partner - ${venue?.name}`,
        `Periode: ${monthLabel} • Partner Share: ${partnerPercentage}%`,
        headers, rows,
        [
          { label: "Total Revenue", value: `Rp ${totalRev.toLocaleString("id-ID")}` },
          { label: "Partner Share", value: `Rp ${totalShare.toLocaleString("id-ID")}` },
          { label: "Jumlah Transaksi", value: String(monthTx.length) },
        ]
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const paidTx = transactions.filter(t => t.payment_status === "paid");
  const totalRevenue = paidTx.reduce((a, t) => a + t.amount, 0);
  const todayRevenue = paidTx.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((a, t) => a + t.amount, 0);
  const partnerSplit = revenueSplits.find(rs => rs.role_name === "partner");
  const partnerPercentage = partnerSplit ? Number(partnerSplit.percentage) : 0;
  const partnerTotalShare = Math.round(totalRevenue * partnerPercentage / 100);
  const partnerTodayShare = Math.round(todayRevenue * partnerPercentage / 100);
  const thisMonthTx = paidTx.filter(t => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyRevenue = thisMonthTx.reduce((a, t) => a + t.amount, 0);
  const monthlyShare = Math.round(monthlyRevenue * partnerPercentage / 100);

  // Chart - 14 days
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toDateString();
    const daySessions = sessions.filter(s => new Date(s.created_at).toDateString() === dateStr).length;
    const dayRevenue = paidTx.filter(t => new Date(t.created_at).toDateString() === dateStr).reduce((a, t) => a + t.amount, 0);
    const dayShare = Math.round(dayRevenue * partnerPercentage / 100);
    return { day: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), sesi: daySessions, share: dayShare / 1000 };
  });

  return (
    <div className="min-h-screen bg-background flex">
      <PartnerSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border p-4 flex items-center gap-4 shrink-0">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{venue?.name || "Partner Dashboard"}</h1>
            <p className="text-xs text-muted-foreground capitalize">{venue?.type} • Partner (Pembeli Booth)</p>
          </div>
          {venues.length > 1 && (
            <div className="relative">
              <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)}
                className="appearance-none bg-muted text-foreground text-xs rounded-lg px-3 py-2 pr-7 border border-border focus:outline-none focus:ring-1 focus:ring-primary">
                {venues.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Stats */}
          {activeSection === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Partner Total", value: `Rp ${(partnerTotalShare / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-primary" },
                { label: "Hari Ini", value: `Rp ${(partnerTodayShare / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-accent" },
                { label: "Bulan Ini", value: `Rp ${(monthlyShare / 1000).toFixed(0)}K`, icon: CalendarDays, color: "text-primary" },
                { label: "Total Sesi", value: sessions.length, icon: Camera, color: "text-accent" },
              ].map((stat, i) => (
                <div key={i} className="glass-card rounded-xl p-4">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Chart */}
          {(activeSection === "overview" || activeSection === "chart") && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                📊 Tren 14 Hari Terakhir
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPartnerRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="sesi" stroke="hsl(var(--accent))" fill="none" strokeWidth={2} name="Sesi" />
                  <Area type="monotone" dataKey="share" stroke="hsl(var(--primary))" fill="url(#colorPartnerRev)" strokeWidth={2} name="Share (K)" />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                * Share = bagian partner ({partnerPercentage}%) dari total revenue
              </p>
            </div>
          )}

          {/* Revenue Split */}
          {(activeSection === "overview" || activeSection === "revenue") && revenueSplits.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Pembagian Revenue
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {revenueSplits.map(rs => (
                  <div key={rs.id} className={`rounded-lg p-3 text-center ${rs.role_name === "partner" ? "bg-primary/10 border border-primary/30" : "bg-muted/50"}`}>
                    <div className={`text-lg font-bold ${rs.role_name === "partner" ? "text-primary" : "text-foreground"}`}>
                      {Number(rs.percentage)}%
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{rs.role_name}</div>
                    {rs.notes && <div className="text-[10px] text-muted-foreground/70 mt-1">{rs.notes}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-sm font-semibold text-foreground">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Partner ({partnerPercentage}%)</p>
                  <p className="text-sm font-bold text-primary">Rp {partnerTotalShare.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions */}
          {(activeSection === "overview" || activeSection === "transactions") && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                💰 Transaksi Terbaru
              </h2>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Tanggal</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Metode</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Revenue</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Partner Share</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 20).map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50">
                          <td className="py-2 text-xs text-foreground">
                            {new Date(tx.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${tx.payment_method === "qris" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                              {tx.payment_method.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 text-xs font-mono text-foreground">Rp {tx.amount.toLocaleString("id-ID")}</td>
                          <td className="py-2 text-xs font-mono text-primary font-medium">
                            Rp {Math.round(tx.amount * partnerPercentage / 100).toLocaleString("id-ID")}
                          </td>
                          <td className="py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              tx.payment_status === "paid" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                            }`}>{tx.payment_status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Photo Sessions */}
          {(activeSection === "overview" || activeSection === "transactions") && sessions.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Sesi Foto Terbaru
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {sessions.slice(0, 12).map((s) => (
                  <div key={s.id} className="rounded-lg overflow-hidden bg-muted">
                    <div className="aspect-square">
                      {s.final_image_url ? (
                        <img src={s.final_image_url} alt={s.short_code} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 text-center">
                      <span className="text-[9px] font-mono text-muted-foreground">{s.short_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          {(activeSection === "overview" || activeSection === "export") && (
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Export Laporan Bulanan
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)}
                  className="bg-muted text-foreground text-sm rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={() => handleExport("csv")}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Excel (CSV)
                </button>
                <button onClick={() => handleExport("pdf")}
                  className="flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-medium px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PartnerDashboard;
