import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PieChart, Save, Info } from "lucide-react";

const ROLE_NAMES = [
  { value: "superadmin", label: "Superadmin (ZMI)" },
  { value: "admin", label: "Admin (Pemilik Booth)" },
  { value: "venue", label: "Venue (Pemilik Lokasi)" },
  { value: "partner", label: "Partner (Pembeli Booth)" },
];

const COOPERATION_TYPES = [
  { value: "revenue_share", label: "Revenue Sharing", desc: "Bagi hasil dari pendapatan" },
  { value: "sewa_bulanan", label: "Sewa Bulanan", desc: "Venue bayar sewa tetap per bulan" },
  { value: "bagi_hasil", label: "Bagi Hasil Murni", desc: "Split revenue tanpa biaya tetap" },
  { value: "franchise", label: "Franchise", desc: "Sistem waralaba dengan fee" },
];

const PPN_RATE = 11; // PPN 11%

const AdminRevenueSplits = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [editSplits, setEditSplits] = useState<Record<string, { percentage: number; notes: string }>>({});
  const [ppnMode, setPpnMode] = useState<"exclude" | "include">("exclude");
  const [cooperationType, setCooperationType] = useState<string>("revenue_share");

  const load = async () => {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from("venues").select("id, name, type"),
      supabase.from("revenue_splits").select("*, venues(name)").order("venue_id"),
    ]);
    setVenues(v || []);
    setSplits(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedVenue) { setEditSplits({}); return; }
    const venueSplits = splits.filter(s => s.venue_id === selectedVenue);
    const map: Record<string, { percentage: number; notes: string }> = {};
    ROLE_NAMES.forEach(r => {
      const existing = venueSplits.find(s => s.role_name === r.value);
      map[r.value] = {
        percentage: existing ? Number(existing.percentage) : 0,
        notes: existing?.notes || "",
      };
    });
    setEditSplits(map);
    // Load ppn_mode and cooperation_type from first split of this venue
    const first = venueSplits[0];
    setPpnMode((first as any)?.ppn_mode || "exclude");
    setCooperationType((first as any)?.cooperation_type || "revenue_share");
  }, [selectedVenue, splits]);

  const handleSave = async () => {
    if (!selectedVenue) return;
    const total = Object.values(editSplits).reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Total harus 100%, saat ini ${total}%`);
      return;
    }

    try {
      await supabase.from("revenue_splits").delete().eq("venue_id", selectedVenue);

      const rows = Object.entries(editSplits)
        .filter(([_, val]) => val.percentage > 0)
        .map(([roleName, val]) => ({
          venue_id: selectedVenue,
          role_name: roleName,
          percentage: val.percentage,
          notes: val.notes || null,
          ppn_mode: ppnMode,
          cooperation_type: cooperationType,
        }));

      if (rows.length > 0) {
        const { error } = await supabase.from("revenue_splits").insert(rows as any);
        if (error) throw error;
      }

      toast.success("Revenue split disimpan");
      load();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = Object.values(editSplits).reduce((sum, s) => sum + s.percentage, 0);

  // Example calculation
  const exampleRevenue = 1000000;
  const revenueBeforePPN = ppnMode === "exclude" ? Math.round(exampleRevenue / (1 + PPN_RATE / 100)) : exampleRevenue;
  const ppnAmount = ppnMode === "exclude" ? exampleRevenue - revenueBeforePPN : 0;
  const splitBase = ppnMode === "exclude" ? revenueBeforePPN : exampleRevenue;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <PieChart className="w-5 h-5" /> Revenue Split
        </h2>
        <p className="text-sm text-muted-foreground">Atur pembagian revenue per venue (flexible per kontrak)</p>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pilih Venue</label>
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground max-w-md"
          >
            <option value="">— Pilih Venue —</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
            ))}
          </select>
        </div>

        {selectedVenue && (
          <>
            {/* Cooperation Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tipe Kerjasama</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COOPERATION_TYPES.map(ct => (
                  <button
                    key={ct.value}
                    onClick={() => setCooperationType(ct.value)}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      cooperationType === ct.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-muted-foreground"
                    }`}
                  >
                    <div className={`text-xs font-medium ${cooperationType === ct.value ? "text-primary" : "text-foreground"}`}>{ct.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{ct.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* PPN Mode */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Perlakuan PPN (11%)</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPpnMode("exclude")}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    ppnMode === "exclude" ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-muted-foreground"
                  }`}
                >
                  <div className={`text-xs font-medium ${ppnMode === "exclude" ? "text-primary" : "text-foreground"}`}>Exclude PPN</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">PPN dikurangi dulu, baru dibagi. Revenue split dari DPP (Dasar Pengenaan Pajak)</div>
                </button>
                <button
                  onClick={() => setPpnMode("include")}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    ppnMode === "include" ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-muted-foreground"
                  }`}
                >
                  <div className={`text-xs font-medium ${ppnMode === "include" ? "text-primary" : "text-foreground"}`}>Include PPN</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Revenue dibagi langsung termasuk PPN. Masing-masing pihak tanggung PPN sendiri</div>
                </button>
              </div>
            </div>

            {/* Simulasi PPN */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Simulasi (Revenue Rp 1.000.000)</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Revenue Kotor</div>
                  <div className="font-mono text-foreground">Rp {exampleRevenue.toLocaleString("id-ID")}</div>
                </div>
                {ppnMode === "exclude" && (
                  <div>
                    <div className="text-muted-foreground">PPN ({PPN_RATE}%)</div>
                    <div className="font-mono text-destructive">- Rp {ppnAmount.toLocaleString("id-ID")}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Dasar Split</div>
                  <div className="font-mono text-primary font-medium">Rp {splitBase.toLocaleString("id-ID")}</div>
                </div>
              </div>
              {Object.entries(editSplits).filter(([_, v]) => v.percentage > 0).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(editSplits).filter(([_, v]) => v.percentage > 0).map(([role, val]) => {
                    const share = Math.round(splitBase * val.percentage / 100);
                    const label = ROLE_NAMES.find(r => r.value === role)?.label || role;
                    return (
                      <div key={role} className="text-xs">
                        <div className="text-muted-foreground">{label} ({val.percentage}%)</div>
                        <div className="font-mono text-foreground">Rp {share.toLocaleString("id-ID")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Split percentages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLE_NAMES.map(role => (
                <div key={role.value} className="border border-border rounded-lg p-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">{role.label}</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Persentase (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editSplits[role.value]?.percentage || 0}
                        onChange={(e) => setEditSplits(prev => ({
                          ...prev,
                          [role.value]: { ...prev[role.value], percentage: Number(e.target.value) }
                        }))}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Catatan</label>
                      <input
                        type="text"
                        value={editSplits[role.value]?.notes || ""}
                        onChange={(e) => setEditSplits(prev => ({
                          ...prev,
                          [role.value]: { ...prev[role.value], notes: e.target.value }
                        }))}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total & save */}
            <div className="flex items-center justify-between pt-2">
              <div className={`text-sm font-medium ${Math.abs(total - 100) < 0.01 ? "text-green-400" : "text-destructive"}`}>
                Total: {total}% {Math.abs(total - 100) < 0.01 ? "✓" : "(harus 100%)"}
              </div>
              <button
                onClick={handleSave}
                disabled={Math.abs(total - 100) > 0.01}
                className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overview of all configured splits */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Konfigurasi yang Sudah Ada</h3>
        {splits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada konfigurasi revenue split</p>
        ) : (
          <div className="space-y-3">
            {venues.filter(v => splits.some(s => s.venue_id === v.id)).map(v => {
              const vSplits = splits.filter(s => s.venue_id === v.id);
              const first = vSplits[0] as any;
              const coopType = COOPERATION_TYPES.find(c => c.value === first?.cooperation_type);
              return (
                <div key={v.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-foreground">{v.name}</div>
                    <div className="flex items-center gap-2">
                      {coopType && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{coopType.label}</span>
                      )}
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        PPN: {first?.ppn_mode === "include" ? "Include" : "Exclude"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vSplits.map(s => (
                      <span key={s.id} className="text-xs bg-muted px-2.5 py-1 rounded-full text-foreground">
                        <span className="capitalize">{s.role_name}</span>: <span className="text-primary font-semibold">{Number(s.percentage)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRevenueSplits;
