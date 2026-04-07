import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const formatRupiah = (n: number) => `Rp ${(n / 1000).toFixed(0)}K`;

const COLORS = ["hsl(165, 80%, 48%)", "hsl(280, 60%, 55%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)"];

const AdminAnalytics = () => {
  const { data: transactions } = useQuery({
    queryKey: ["admin-analytics-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, kiosk:kiosks(kiosk_code, location_name)")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  // Group by day for daily revenue
  const dailyRevenue = (() => {
    if (!transactions) return [];
    const map = new Map<string, number>();
    const today = new Date();
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      map.set(key, 0);
    }
    transactions.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + tx.amount);
      }
    });
    return Array.from(map, ([date, revenue]) => ({ date, revenue }));
  })();

  // Revenue by venue
  const venueRevenue = (() => {
    if (!transactions) return [];
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      const kiosk = tx.kiosk as { kiosk_code: string; location_name: string } | null;
      const name = kiosk?.location_name || "Unknown";
      map.set(name, (map.get(name) || 0) + tx.amount);
    });
    return Array.from(map, ([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + "..." : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  const totalRevenue = transactions?.reduce((s, t) => s + t.amount, 0) || 0;
  const avgPerTx = transactions && transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Statistik revenue dan performa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-foreground">Rp {totalRevenue.toLocaleString("id-ID")}</div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Total Transaksi</div>
          <div className="text-2xl font-bold text-foreground">{transactions?.length || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Rata-rata/Transaksi</div>
          <div className="text-2xl font-bold text-foreground">Rp {avgPerTx.toLocaleString("id-ID")}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Bar Chart */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Revenue Harian (7 hari)</h2>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
                <YAxis tickFormatter={formatRupiah} tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 14%, 16%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }}
                  formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(165, 80%, 48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">Belum ada data</div>
          )}
        </div>

        {/* Venue Pie Chart */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Revenue per Venue</h2>
          {venueRevenue.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={280}>
                <PieChart>
                  <Pie data={venueRevenue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                    {venueRevenue.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(220, 14%, 16%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }}
                    formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {venueRevenue.map((v, i) => (
                  <div key={v.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground truncate">{v.name}</div>
                      <div className="text-[10px] text-muted-foreground">Rp {v.value.toLocaleString("id-ID")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">Belum ada data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
