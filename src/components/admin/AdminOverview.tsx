import { motion } from "framer-motion";
import { DollarSign, Printer, Monitor, TrendingUp, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const statusIcon = (status: string) => {
  switch (status) {
    case "online": return <Wifi className="w-4 h-4 text-success" />;
    case "offline": return <WifiOff className="w-4 h-4 text-destructive" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />;
    default: return null;
  }
};

const AdminOverview = () => {
  const { data: kiosks } = useQuery({
    queryKey: ["admin-kiosks"],
    queryFn: async () => {
      const { data } = await supabase.from("kiosks").select("*");
      return data || [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const totalRevenue = transactions?.reduce((s, t) => s + (t.payment_status === "paid" ? t.amount : 0), 0) || 0;
  const totalPrints = transactions?.filter(t => t.payment_status === "paid").length || 0;
  const onlineCount = kiosks?.filter(k => k.status === "online").length || 0;

  const stats = [
    { label: "Total Pendapatan", value: formatRupiah(totalRevenue), icon: DollarSign, color: "text-primary" },
    { label: "Total Cetak", value: totalPrints.toLocaleString(), icon: Printer, color: "text-accent" },
    { label: "Kiosk Aktif", value: `${onlineCount}/${kiosks?.length || 0}`, icon: Monitor, color: "text-success" },
    { label: "Total Transaksi", value: (transactions?.length || 0).toLocaleString(), icon: TrendingUp, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ringkasan Dashboard</h1>
        <p className="text-sm text-muted-foreground">ZMI Photobox — Pusat Kontrol</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Mesin Kiosk</h2>
          <div className="space-y-3">
            {(kiosks || []).map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {statusIcon(k.status)}
                  <div>
                    <div className="text-sm font-medium text-foreground">{k.kiosk_code}</div>
                    <div className="text-xs text-muted-foreground">{k.location_name}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${k.status === "online" ? "bg-success/10 text-success" : k.status === "warning" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                  {k.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transaksi Terkini</h2>
          <div className="space-y-3">
            {(transactions || []).slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-foreground">{tx.id.slice(0, 8)}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-primary">{formatRupiah(tx.amount)}</div>
                  <div className={`text-[10px] ${tx.payment_status === "paid" ? "text-success" : "text-warning"}`}>{tx.payment_status}</div>
                </div>
              </div>
            ))}
            {(!transactions || transactions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
