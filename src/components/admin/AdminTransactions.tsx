import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Wifi, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, BarChart3, Download, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const PAGE_SIZE = 25;

const AdminTransactions = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "weekly">("daily");
  const queryClient = useQueryClient();

  // Summary stats
  const { data: stats } = useQuery({
    queryKey: ["admin-tx-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [allRes, todayRes, paidRes, pendingRes] = await Promise.all([
        supabase.from("transactions").select("amount", { count: "exact" }),
        supabase.from("transactions").select("amount").gte("created_at", `${today}T00:00:00`),
        supabase.from("transactions").select("amount").eq("payment_status", "paid"),
        supabase.from("transactions").select("amount").eq("payment_status", "pending"),
      ]);
      const totalRevenue = (paidRes.data || []).reduce((s: number, t: any) => s + t.amount, 0);
      const todayRevenue = (todayRes.data || []).filter((t: any) => true).reduce((s: number, t: any) => s + t.amount, 0);
      return {
        totalTransactions: allRes.count || 0,
        totalRevenue,
        todayCount: todayRes.data?.length || 0,
        todayRevenue,
        paidCount: paidRes.data?.length || 0,
        pendingCount: pendingRes.data?.length || 0,
      };
    },
    refetchInterval: 30000,
  });

  // Chart data - paid transactions from last 30 days
  const { data: chartTransactions } = useQuery({
    queryKey: ["admin-tx-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      return data || [];
    },
    refetchInterval: 30000,
  });

  const chartData = useMemo(() => {
    if (!chartTransactions?.length) return [];
    if (chartMode === "daily") {
      const map = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        map.set(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), 0);
      }
      chartTransactions.forEach((tx: any) => {
        const key = new Date(tx.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        if (map.has(key)) map.set(key, (map.get(key) || 0) + tx.amount);
      });
      return Array.from(map, ([date, revenue]) => ({ label: date, revenue }));
    } else {
      const map = new Map<string, number>();
      for (let i = 3; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = `W${weekStart.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`;
        map.set(key, 0);
      }
      chartTransactions.forEach((tx: any) => {
        const d = new Date(tx.created_at);
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = `W${weekStart.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`;
        if (map.has(key)) map.set(key, (map.get(key) || 0) + tx.amount);
      });
      return Array.from(map, ([label, revenue]) => ({ label, revenue }));
    }
  }, [chartTransactions, chartMode]);

  // Transactions list
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["admin-transactions-all", page, statusFilter, methodFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, kiosk:kiosks(kiosk_code, location_name)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);
      if (methodFilter !== "all") query = query.eq("payment_method", methodFilter);
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

      const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return { transactions: data || [], total: count || 0 };
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-transactions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["admin-transactions-all"] });
        queryClient.invalidateQueries({ queryKey: ["admin-tx-stats"] });

        if (payload.eventType === "INSERT") {
          const tx = payload.new as any;
          toast.info("💳 Transaksi baru", {
            description: `${formatRupiah(tx.amount)} — ${tx.payment_method} (${tx.payment_status})`,
          });
        } else if (payload.eventType === "UPDATE") {
          const tx = payload.new as any;
          if (tx.payment_status === "paid") {
            toast.success("✅ Pembayaran berhasil", {
              description: `${formatRupiah(tx.amount)} — ${tx.payment_method}`,
            });
          } else if (tx.payment_status === "failed") {
            toast.error("❌ Pembayaran gagal", {
              description: `${formatRupiah(tx.amount)}`,
            });
          }
        }
      })
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const transactions = result?.transactions || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? transactions.filter((tx: any) => {
        const kiosk = tx.kiosk as any;
        return (
          kiosk?.kiosk_code?.toLowerCase().includes(search.toLowerCase()) ||
          kiosk?.location_name?.toLowerCase().includes(search.toLowerCase()) ||
          tx.id.toLowerCase().includes(search.toLowerCase()) ||
          tx.qris_reference_id?.toLowerCase().includes(search.toLowerCase())
        );
      })
    : transactions;

  const statusIcon = (status: string) => {
    if (status === "paid") return <CheckCircle className="w-3.5 h-3.5" />;
    if (status === "pending") return <Clock className="w-3.5 h-3.5" />;
    return <XCircle className="w-3.5 h-3.5" />;
  };

  // Export to CSV
  const exportCSV = async () => {
    let query = supabase
      .from("transactions")
      .select("id, amount, payment_status, payment_method, qris_reference_id, created_at, kiosk:kiosks(kiosk_code, location_name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);
    if (methodFilter !== "all") query = query.eq("payment_method", methodFilter);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data } = await query.limit(1000);
    if (!data?.length) return toast.error("Tidak ada data untuk diekspor");

    const rows = data.map((tx: any) => ({
      ID: tx.id,
      Tanggal: new Date(tx.created_at).toLocaleString("id-ID"),
      Kiosk: (tx.kiosk as any)?.kiosk_code || "-",
      Lokasi: (tx.kiosk as any)?.location_name || "-",
      Jumlah: tx.amount,
      Metode: tx.payment_method,
      Status: tx.payment_status,
      Referensi: tx.qris_reference_id || "-",
    }));

    const header = Object.keys(rows[0]).join(",");
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaksi_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh");
  };

  // Export to PDF (printable HTML)
  const exportPDF = async () => {
    let query = supabase
      .from("transactions")
      .select("id, amount, payment_status, payment_method, qris_reference_id, created_at, kiosk:kiosks(kiosk_code, location_name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);
    if (methodFilter !== "all") query = query.eq("payment_method", methodFilter);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data } = await query.limit(1000);
    if (!data?.length) return toast.error("Tidak ada data untuk diekspor");

    const totalAmount = data.filter((t: any) => t.payment_status === "paid").reduce((s: number, t: any) => s + t.amount, 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return toast.error("Popup diblokir, izinkan popup untuk ekspor PDF");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Laporan Transaksi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        .summary { background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 24px; }
        .summary div { font-size: 13px; }
        .summary strong { font-size: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; }
        .paid { color: #16a34a; } .pending { color: #ca8a04; } .failed { color: #dc2626; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>📊 Laporan Transaksi</h1>
      <div class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}${dateFrom ? ` | Dari: ${dateFrom}` : ""}${dateTo ? ` | Sampai: ${dateTo}` : ""}</div>
      <div class="summary">
        <div>Total Transaksi: <strong>${data.length}</strong></div>
        <div>Total Pendapatan (Paid): <strong>Rp ${totalAmount.toLocaleString("id-ID")}</strong></div>
      </div>
      <table>
        <thead><tr><th>No</th><th>Tanggal</th><th>Kiosk</th><th>Jumlah</th><th>Metode</th><th>Status</th><th>Referensi</th></tr></thead>
        <tbody>${data.map((tx: any, i: number) => `<tr>
          <td>${i + 1}</td>
          <td>${new Date(tx.created_at).toLocaleString("id-ID")}</td>
          <td>${(tx.kiosk as any)?.kiosk_code || "-"}</td>
          <td>Rp ${tx.amount.toLocaleString("id-ID")}</td>
          <td>${tx.payment_method.toUpperCase()}</td>
          <td class="${tx.payment_status}">${tx.payment_status.toUpperCase()}</td>
          <td style="font-size:10px">${tx.qris_reference_id || "-"}</td>
        </tr>`).join("")}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
    toast.success("PDF siap dicetak");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring Pembayaran</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-1.5 text-xs ${realtimeConnected ? "text-primary" : "text-muted-foreground"}`}>
              <Wifi className="w-3.5 h-3.5" />
              {realtimeConnected ? "Real-time aktif" : "Menghubungkan..."}
            </div>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs text-muted-foreground">{total} transaksi</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["admin-tx-stats"] }); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <TrendingUp className="w-4 h-4" /> Total Pendapatan
          </div>
          <div className="text-xl font-bold text-primary">{formatRupiah(stats?.totalRevenue || 0)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{stats?.paidCount || 0} transaksi berhasil</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <CheckCircle className="w-4 h-4" /> Hari Ini
          </div>
          <div className="text-xl font-bold text-foreground">{formatRupiah(stats?.todayRevenue || 0)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{stats?.todayCount || 0} transaksi</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Clock className="w-4 h-4" /> Pending
          </div>
          <div className="text-xl font-bold text-yellow-500">{stats?.pendingCount || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Menunggu pembayaran</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <AlertCircle className="w-4 h-4" /> Total Transaksi
          </div>
          <div className="text-xl font-bold text-foreground">{stats?.totalTransactions || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Semua status</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Grafik Pendapatan</h2>
          </div>
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setChartMode("daily")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${chartMode === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Harian
            </button>
            <button onClick={() => setChartMode("weekly")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${chartMode === "weekly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Mingguan
            </button>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [formatRupiah(value), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">Belum ada data transaksi</div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kiosk, ID transaksi, atau referensi Flip..."
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="all">Semua Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="all">Semua Metode</option>
          <option value="qris">QRIS</option>
          <option value="va">Virtual Account</option>
          <option value="ewallet">E-Wallet</option>
          <option value="flip">Flip (Semua)</option>
          <option value="cash">Cash</option>
        </select>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-3 p-4 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>ID / Ref</span>
          <span>Kiosk</span>
          <span>Jumlah</span>
          <span>Metode</span>
          <span>Status</span>
          <span>Waktu</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length > 0 ? (
          filtered.map((tx: any) => {
            const kiosk = tx.kiosk as { kiosk_code: string; location_name: string } | null;
            return (
              <div key={tx.id} className="grid grid-cols-6 gap-3 p-4 border-b border-border/50 hover:bg-muted/20 transition-colors items-center">
                <div>
                  <div className="text-xs font-mono text-foreground">{tx.id.slice(0, 8)}...</div>
                   {tx.qris_reference_id && (
                     <div className="text-[10px] font-mono text-muted-foreground">{tx.qris_reference_id}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-foreground">{kiosk?.kiosk_code || "-"}</div>
                  <div className="text-[10px] text-muted-foreground">{kiosk?.location_name || ""}</div>
                </div>
                <span className="text-sm font-mono text-primary font-medium">{formatRupiah(tx.amount)}</span>
                <span className="text-xs text-foreground uppercase">{tx.payment_method}</span>
                <span className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit ${
                  tx.payment_status === "paid" ? "bg-primary/10 text-primary" :
                  tx.payment_status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {statusIcon(tx.payment_status)}
                  {tx.payment_status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString("id-ID")}
                </span>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">Tidak ada transaksi</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 inline-flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 inline-flex items-center gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
