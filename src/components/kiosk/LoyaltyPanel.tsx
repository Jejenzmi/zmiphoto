import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Star, Loader2, Phone, ArrowRight, X, Check, Sparkles, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playPointsEarned, playError, playSuccessChime } from "@/services/audioService";

interface LoyaltyPanelProps {
  sessionCode: string;
  onPointsEarned?: (points: number) => void;
  onRewardRedeemed?: (reward: Reward) => void;
}

interface Reward {
  id: string;
  name: string;
  emoji: string;
  pointsCost: number;
  description: string;
  type: string;
}

const FALLBACK_REWARDS: Reward[] = [
  { id: "free-print", name: "Free Print", emoji: "🖨️", pointsCost: 50, description: "1x cetak gratis", type: "free_print" },
  { id: "discount-30", name: "Diskon 30%", emoji: "💰", pointsCost: 30, description: "Potongan 30% sesi berikutnya", type: "discount" },
  { id: "extra-photo", name: "+1 Foto Extra", emoji: "📸", pointsCost: 20, description: "Tambahan 1 jepretan", type: "extra_photo" },
  { id: "premium-filter", name: "Premium Filter", emoji: "✨", pointsCost: 15, description: "Akses filter AI premium", type: "premium_filter" },
];

const getLevel = (points: number) => {
  if (points >= 500) return { name: "Diamond", emoji: "💎", color: "text-cyan-300", next: null, need: 0 };
  if (points >= 200) return { name: "Gold", emoji: "✨", color: "text-yellow-300", next: "Diamond 💎", need: 500 - points };
  if (points >= 50) return { name: "Silver", emoji: "🥈", color: "text-gray-300", next: "Gold ✨", need: 200 - points };
  return { name: "Bronze", emoji: "🥉", color: "text-orange-300", next: "Silver 🥈", need: 50 - points };
};

const LoyaltyPanel = ({ sessionCode, onPointsEarned, onRewardRedeemed }: LoyaltyPanelProps) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberData, setMemberData] = useState<{
    id: string;
    phone: string;
    total_points: number;
  } | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [step, setStep] = useState<"input" | "result" | "rewards">("input");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>(FALLBACK_REWARDS);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data } = await supabase
        .from("loyalty_rewards" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setRewards((data as any[]).map((r) => ({
          id: r.id,
          name: r.name,
          emoji: r.emoji,
          pointsCost: r.points_cost,
          description: r.description || "",
          type: r.reward_type,
        })));
      }
    };
    fetchRewards();
  }, []);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.startsWith("0")) return "+62" + digits.slice(1);
    if (digits.startsWith("62")) return "+" + digits;
    return digits;
  };

  const handleSubmit = async () => {
    const formatted = formatPhone(phone);
    if (formatted.length < 10) {
      toast.error("Nomor telepon tidak valid");
      playError();
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("loyalty_members" as any)
        .select("*")
        .eq("phone", formatted)
        .maybeSingle();

      const earnedPoints = 10;

      if (existing) {
        const newTotal = (existing as any).total_points + earnedPoints;
        await supabase
          .from("loyalty_members" as any)
          .update({ total_points: newTotal } as any)
          .eq("id", (existing as any).id);

        await (supabase.from("loyalty_transactions" as any) as any).insert({
          member_id: (existing as any).id,
          points: earnedPoints,
          type: "earn",
          description: `Sesi foto ${sessionCode}`,
          session_code: sessionCode,
        });

        setMemberData({ id: (existing as any).id, phone: (existing as any).phone, total_points: newTotal });
      } else {
        const { data: newMember } = await (supabase.from("loyalty_members" as any) as any)
          .insert({ phone: formatted, total_points: earnedPoints })
          .select()
          .single();

        if (newMember) {
          await (supabase.from("loyalty_transactions" as any) as any).insert({
            member_id: newMember.id,
            points: earnedPoints,
            type: "earn",
            description: `Sesi foto ${sessionCode} (member baru!)`,
            session_code: sessionCode,
          });
          setMemberData({ id: newMember.id, phone: formatted, total_points: earnedPoints });
        }
      }

      setPointsEarned(earnedPoints);
      setStep("result");
      onPointsEarned?.(earnedPoints);
      playPointsEarned();
      toast.success(`+${earnedPoints} poin! 🎉`);
    } catch (e) {
      console.error("Loyalty error:", e);
      toast.error("Gagal mencatat poin");
      playError();
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (!memberData || memberData.total_points < reward.pointsCost) {
      toast.error("Poin tidak cukup!");
      playError();
      return;
    }

    setRedeeming(reward.id);
    try {
      const newTotal = memberData.total_points - reward.pointsCost;
      await supabase
        .from("loyalty_members" as any)
        .update({ total_points: newTotal } as any)
        .eq("id", memberData.id);

      await (supabase.from("loyalty_transactions" as any) as any).insert({
        member_id: memberData.id,
        points: -reward.pointsCost,
        type: "redeem",
        description: `Redeem: ${reward.name}`,
        session_code: sessionCode,
      });

      setMemberData({ ...memberData, total_points: newTotal });
      onRewardRedeemed?.(reward);
      playSuccessChime();
      toast.success(`${reward.emoji} ${reward.name} berhasil di-redeem!`);
    } catch (e) {
      console.error("Redeem error:", e);
      toast.error("Gagal redeem reward");
      playError();
    } finally {
      setRedeeming(null);
    }
  };

  if (step === "rewards" && memberData) {
    const level = getLevel(memberData.total_points);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-primary" /> Tukar Poin
          </h3>
          <button onClick={() => setStep("result")} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 py-1">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-lg font-bold text-foreground">{memberData.total_points}</span>
          <span className="text-xs text-muted-foreground">poin tersedia</span>
        </div>

        <div className="space-y-2">
          {rewards.map((reward) => {
            const canAfford = memberData.total_points >= reward.pointsCost;
            return (
              <button
                key={reward.id}
                onClick={() => canAfford && handleRedeem(reward)}
                disabled={!canAfford || redeeming === reward.id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  canAfford
                    ? "glass-card hover:border-primary/50 cursor-pointer"
                    : "bg-muted/30 opacity-50 cursor-not-allowed"
                }`}
              >
                <span className="text-2xl">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{reward.name}</div>
                  <div className="text-[10px] text-muted-foreground">{reward.description}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {redeeming === reward.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-bold text-foreground">{reward.pointsCost}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  if (step === "result" && memberData) {
    const level = getLevel(memberData.total_points);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-xl p-4 text-center space-y-2">
        <div className="text-3xl">🎉</div>
        <p className="text-sm font-semibold text-foreground">+{pointsEarned} Poin!</p>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-lg font-bold text-foreground">{memberData.total_points}</span>
          <span className="text-xs text-muted-foreground">total poin</span>
        </div>
        <p className={`text-xs font-medium ${level.color}`}>Level: {level.emoji} {level.name}</p>
        {level.next && (
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, ((memberData.total_points) / (memberData.total_points + level.need)) * 100)}%` }}
            />
          </div>
        )}
        {level.next && (
          <p className="text-[10px] text-muted-foreground">{level.need} poin lagi ke {level.next}</p>
        )}
        <button
          onClick={() => setStep("rewards")}
          className="w-full mt-2 bg-accent text-accent-foreground font-medium py-2 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" /> Tukar Poin →
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Kumpulkan Poin!</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Masukkan nomor HP untuk dapat +10 poin. Tukar dengan free print & diskon!
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="w-full bg-muted rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || phone.length < 8}
          className="bg-primary text-primary-foreground px-4 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
};

export default LoyaltyPanel;
