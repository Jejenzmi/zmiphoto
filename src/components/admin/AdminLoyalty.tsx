import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Star, Gift, TrendingUp, Search, ArrowUpDown, Phone, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getLevel = (points: number) => {
  if (points >= 500) return { name: "Diamond", emoji: "💎", color: "text-cyan-300" };
  if (points >= 200) return { name: "Gold", emoji: "✨", color: "text-yellow-300" };
  if (points >= 50) return { name: "Silver", emoji: "🥈", color: "text-gray-300" };
  return { name: "Bronze", emoji: "🥉", color: "text-orange-300" };
};

const REWARD_TYPES = [
  { value: "free_print", label: "Free Print" },
  { value: "discount", label: "Diskon" },
  { value: "extra_photo", label: "Extra Foto" },
  { value: "premium_filter", label: "Premium Filter" },
];

const EMOJI_OPTIONS = ["🎁", "🖨️", "💰", "📸", "✨", "🎉", "🏆", "💎", "🎯", "⭐"];

interface RewardForm {
  name: string;
  emoji: string;
  points_cost: number;
  description: string;
  reward_type: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: RewardForm = { name: "", emoji: "🎁", points_cost: 10, description: "", reward_type: "discount", is_active: true, sort_order: 0 };

const AdminLoyalty = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "recent">("points");
  const [tab, setTab] = useState<"members" | "rewards">("members");
  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardForm, setRewardForm] = useState<RewardForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["admin-loyalty-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_members" as any)
        .select("*")
        .order("total_points", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["admin-loyalty-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ["admin-loyalty-rewards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_rewards" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
  });

  const saveRewardMutation = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: RewardForm }) => {
      if (id) {
        const { error } = await supabase.from("loyalty_rewards" as any).update(form as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("loyalty_rewards" as any) as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-rewards"] });
      setEditingReward(null);
      setShowAddReward(false);
      setRewardForm(emptyForm);
      toast.success("Reward berhasil disimpan!");
    },
    onError: () => toast.error("Gagal menyimpan reward"),
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loyalty_rewards" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-rewards"] });
      toast.success("Reward dihapus!");
    },
    onError: () => toast.error("Gagal menghapus reward"),
  });

  const totalMembers = members?.length || 0;
  const totalPoints = members?.reduce((sum: number, m: any) => sum + (m.total_points || 0), 0) || 0;
  const totalRedeemed = transactions?.filter((t: any) => t.type === "redeem").length || 0;
  const totalEarned = transactions?.filter((t: any) => t.type === "earn").reduce((sum: number, t: any) => sum + t.points, 0) || 0;

  const filteredMembers = members?.filter((m: any) =>
    m.phone?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const sortedMembers = [...filteredMembers].sort((a: any, b: any) => {
    if (sortBy === "points") return b.total_points - a.total_points;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const startEditReward = (reward: any) => {
    setEditingReward(reward.id);
    setRewardForm({
      name: reward.name,
      emoji: reward.emoji,
      points_cost: reward.points_cost,
      description: reward.description || "",
      reward_type: reward.reward_type,
      is_active: reward.is_active,
      sort_order: reward.sort_order,
    });
  };

  const RewardFormUI = ({ isNew }: { isNew: boolean }) => (
    <div className="glass-card rounded-xl p-4 space-y-3 border border-primary/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{isNew ? "Tambah Reward" : "Edit Reward"}</h4>
        <button onClick={() => { setShowAddReward(false); setEditingReward(null); setRewardForm(emptyForm); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Nama</label>
          <input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Nama reward" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Poin</label>
          <input type="number" value={rewardForm.points_cost} onChange={(e) => setRewardForm({ ...rewardForm, points_cost: Number(e.target.value) })} className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">Deskripsi</label>
        <input value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Keterangan singkat" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Emoji</label>
          <div className="flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button key={e} onClick={() => setRewardForm({ ...rewardForm, emoji: e })} className={`w-7 h-7 rounded text-sm ${rewardForm.emoji === e ? "bg-primary/30 ring-1 ring-primary" : "bg-muted hover:bg-muted/80"}`}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Tipe</label>
          <select value={rewardForm.reward_type} onChange={(e) => setRewardForm({ ...rewardForm, reward_type: e.target.value })} className="w-full bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            {REWARD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={rewardForm.is_active} onChange={(e) => setRewardForm({ ...rewardForm, is_active: e.target.checked })} className="rounded" /> Aktif
        </label>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Urutan:</label>
          <input type="number" value={rewardForm.sort_order} onChange={(e) => setRewardForm({ ...rewardForm, sort_order: Number(e.target.value) })} className="w-14 bg-muted rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <button
        onClick={() => saveRewardMutation.mutate({ id: isNew ? undefined : editingReward!, form: rewardForm })}
        disabled={!rewardForm.name || saveRewardMutation.isPending}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
      >
        {saveRewardMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        {isNew ? "Tambah" : "Simpan"}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> Loyalty Program
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Kelola member, poin, reward, dan redemption</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Member", value: totalMembers, icon: Users, color: "text-primary" },
          { label: "Total Poin Beredar", value: totalPoints.toLocaleString(), icon: Star, color: "text-yellow-400" },
          { label: "Total Poin Diberikan", value: totalEarned.toLocaleString(), icon: TrendingUp, color: "text-green-400" },
          { label: "Total Redemption", value: totalRedeemed, icon: Gift, color: "text-accent" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["members", "rewards"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "members" ? "👥 Member" : "🎁 Rewards"}
          </button>
        ))}
      </div>

      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Daftar Reward</h3>
            {!showAddReward && (
              <button onClick={() => { setShowAddReward(true); setRewardForm(emptyForm); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            )}
          </div>

          {showAddReward && <RewardFormUI isNew />}

          {rewardsLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
          ) : !rewards?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Belum ada reward</div>
          ) : (
            <div className="space-y-2">
              {rewards.map((r: any) => (
                editingReward === r.id ? (
                  <RewardFormUI key={r.id} isNew={false} />
                ) : (
                  <div key={r.id} className={`glass-card rounded-xl p-4 flex items-center gap-3 ${!r.is_active ? "opacity-50" : ""}`}>
                    <span className="text-2xl">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {r.name}
                        {!r.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Nonaktif</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{r.description}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Tipe: {r.reward_type} · Urutan: {r.sort_order}</div>
                    </div>
                    <div className="flex items-center gap-1 mr-2">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span className="text-sm font-bold text-foreground">{r.points_cost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditReward(r)} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Hapus reward ini?")) deleteRewardMutation.mutate(r.id); }} className="p-1.5 rounded-lg bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "members" && (
        <>
          {/* Members table */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-foreground">Daftar Member</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor HP..." className="bg-muted rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-40" />
                </div>
                <button onClick={() => setSortBy(sortBy === "points" ? "recent" : "points")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowUpDown className="w-3 h-3" />
                  {sortBy === "points" ? "Poin" : "Terbaru"}
                </button>
              </div>
            </div>

            {membersLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Memuat data...</div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada member</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Telepon</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Level</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Poin</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Bergabung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMembers.map((member: any, i: number) => {
                      const level = getLevel(member.total_points);
                      return (
                        <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-foreground font-mono text-xs">{member.phone}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-xs font-medium ${level.color}`}>{level.emoji} {level.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-foreground font-bold">{member.total_points}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Riwayat Transaksi Poin</h3>
            {txLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Memuat...</div>
            ) : !transactions?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Belum ada transaksi</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${tx.type === "earn" ? "bg-green-500/20 text-green-400" : "bg-accent/20 text-accent"}`}>
                        {tx.type === "earn" ? "+" : "−"}
                      </div>
                      <div>
                        <div className="text-xs text-foreground font-medium">{tx.description || tx.type}</div>
                        <div className="text-[10px] text-muted-foreground">{tx.session_code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${tx.type === "earn" ? "text-green-400" : "text-accent"}`}>
                        {tx.type === "earn" ? "+" : "−"}{Math.abs(tx.points)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLoyalty;
