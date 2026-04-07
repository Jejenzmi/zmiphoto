import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export const useRealtimeNotifications = () => {
  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const tx = payload.new as any;
          toast.success("💰 Transaksi Baru", {
            description: `${formatRupiah(tx.amount)} via ${tx.payment_method} — ${tx.payment_status}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kiosks" },
        (payload) => {
          const kiosk = payload.new as any;
          const old = payload.old as any;
          if (old.status !== kiosk.status) {
            const icon = kiosk.status === "online" ? "🟢" : kiosk.status === "warning" ? "🟡" : "🔴";
            toast.info(`${icon} Kiosk ${kiosk.kiosk_code}`, {
              description: `Status berubah: ${old.status} → ${kiosk.status} (${kiosk.location_name})`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
