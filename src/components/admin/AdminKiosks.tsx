import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Wifi, WifiOff, AlertTriangle, Camera, Save, Loader2, Search, Building2, Clock } from "lucide-react";
import { toast } from "sonner";

type CameraPosition = "front" | "side-left" | "side-right" | "top" | "bottom";
interface CameraConfig {
  position: CameraPosition;
  model: string;
  enabled: boolean;
}

const CAMERA_POSITIONS: { value: CameraPosition; label: string; emoji: string }[] = [
  { value: "front", label: "Depan", emoji: "📷" },
  { value: "side-left", label: "Samping Kiri", emoji: "📸" },
  { value: "side-right", label: "Samping Kanan", emoji: "📸" },
  { value: "top", label: "Atas", emoji: "⬆️" },
  { value: "bottom", label: "Bawah", emoji: "⬇️" },
];

const isOnlineRecently = (lastPing: string | null) => {
  if (!lastPing) return false;
  return Date.now() - new Date(lastPing).getTime() < 60000; // online if pinged < 60s ago
};

const statusIcon = (status: string, lastPing: string | null) => {
  const live = isOnlineRecently(lastPing);
  if (live) return <Wifi className="w-4 h-4 text-green-500" />;
  switch (status) {
    case "online": return <Wifi className="w-4 h-4 text-yellow-500" />; // stale online
    case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default: return <WifiOff className="w-4 h-4 text-destructive" />;
  }
};

const ALL_PAYMENT_METHODS = [
  { id: "all", label: "Semua Metode" },
  { id: "qris", label: "QRIS" },
  { id: "va_bca", label: "BCA VA" },
  { id: "va_bni", label: "BNI VA" },
  { id: "va_bri", label: "BRI VA" },
  { id: "va_mandiri", label: "Mandiri VA" },
  { id: "ovo", label: "OVO" },
  { id: "dana", label: "DANA" },
  { id: "shopeepay", label: "ShopeePay" },
];

const emptyForm = {
  kiosk_code: "",
  location_name: "",
  mac_address: "",
  status: "offline" as string,
  notes: "",
  venue_id: "" as string,
  camera_config: [{ position: "front" as CameraPosition, model: "Canon 1300D", enabled: true }] as CameraConfig[],
  allowed_payment_methods: ALL_PAYMENT_METHODS.map(m => m.id),
};

const PAGE_SIZE = 20;

const AdminKiosks = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: venues } = useQuery({
    queryKey: ["venues-for-kiosk"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: kioskResult, isLoading } = useQuery({
    queryKey: ["admin-kiosks-detail", page, search, statusFilter],
    queryFn: async () => {
      let query = supabase.from("kiosks").select("*, venue:venues(name)", { count: "exact" });
      if (search) {
        query = query.or(`kiosk_code.ilike.%${search}%,location_name.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, count } = await query.order("kiosk_code").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return { kiosks: data || [], total: count || 0 };
    },
  });

  const kiosks = kioskResult?.kiosks || [];
  const totalKiosks = kioskResult?.total || 0;
  const totalPages = Math.ceil(totalKiosks / PAGE_SIZE);

  // Auto-refresh every 30s for live status
  useQuery({
    queryKey: ["kiosk-heartbeat-refresh"],
    queryFn: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kiosks-detail"] });
      return null;
    },
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kiosks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kiosks-detail"] });
      toast.success("Kiosk dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (k: any) => {
    setEditingId(k.id);
    const cameraConfig = Array.isArray(k.camera_config)
      ? (k.camera_config as unknown as CameraConfig[])
      : [{ position: "front" as CameraPosition, model: "Canon 1300D", enabled: true }];
    const allowedMethods = Array.isArray(k.allowed_payment_methods)
      ? (k.allowed_payment_methods as string[])
      : ALL_PAYMENT_METHODS.map(m => m.id);
    setForm({
      kiosk_code: k.kiosk_code,
      location_name: k.location_name,
      mac_address: k.mac_address || "",
      status: k.status,
      notes: k.notes || "",
      venue_id: k.venue_id || "",
      camera_config: cameraConfig,
      allowed_payment_methods: allowedMethods,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.kiosk_code.trim() || !form.location_name.trim()) {
      return toast.error("Kode kiosk dan lokasi wajib diisi");
    }
    setSaving(true);
    const payload = {
      kiosk_code: form.kiosk_code,
      location_name: form.location_name,
      mac_address: form.mac_address || null,
      status: form.status,
      notes: form.notes || null,
      venue_id: form.venue_id || null,
      camera_config: JSON.parse(JSON.stringify(form.camera_config)),
      allowed_payment_methods: form.allowed_payment_methods,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("kiosks").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("kiosks").insert(payload as any));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Kiosk diperbarui" : "Kiosk ditambahkan");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-kiosks-detail"] });
    }
  };

  const addCamera = () => {
    const used = form.camera_config.map((c) => c.position);
    const next = CAMERA_POSITIONS.find((p) => !used.includes(p.value));
    if (!next) return toast.error("Semua posisi kamera sudah digunakan");
    setForm({ ...form, camera_config: [...form.camera_config, { position: next.value, model: "Canon 1300D", enabled: true }] });
  };

  const updateCamera = (idx: number, updates: Partial<CameraConfig>) => {
    const newCams = form.camera_config.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    setForm({ ...form, camera_config: newCams });
  };

  const removeCamera = (idx: number) => {
    setForm({ ...form, camera_config: form.camera_config.filter((_, i) => i !== idx) });
  };

  const venueMap = new Map((venues || []).map(v => [v.id, v.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mesin Kiosk</h1>
          <p className="text-sm text-muted-foreground">
            {totalKiosks} kiosk terdaftar
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Tambah Kiosk
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari kode kiosk atau lokasi..."
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="all">Semua Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? "Edit Kiosk" : "Kiosk Baru"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Kode Kiosk *</label>
              <input value={form.kiosk_code} onChange={(e) => setForm({ ...form, kiosk_code: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="KIOSK-006" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Lokasi *</label>
              <input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama Mall / Venue" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">MAC Address</label>
              <input value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Venue</label>
              <select value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Tanpa Venue —</option>
                {(venues || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Catatan</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Catatan tambahan..." />
            </div>
          </div>

          {/* Camera Config */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Konfigurasi Kamera ({form.camera_config.length})
              </h4>
              <button onClick={addCamera} className="text-xs text-primary hover:opacity-80 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Tambah Kamera
              </button>
            </div>
            <div className="space-y-2">
              {form.camera_config.map((cam, idx) => {
                const pos = CAMERA_POSITIONS.find((p) => p.value === cam.position);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <span className="text-lg">{pos?.emoji || "📷"}</span>
                    <select value={cam.position} onChange={(e) => updateCamera(idx, { position: e.target.value as CameraPosition })}
                      className="bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                      {CAMERA_POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input value={cam.model} onChange={(e) => updateCamera(idx, { model: e.target.value })}
                      className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Model kamera" />
                    <button onClick={() => updateCamera(idx, { enabled: !cam.enabled })}
                      className={`text-xs px-2 py-1 rounded ${cam.enabled ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                      {cam.enabled ? "ON" : "OFF"}
                    </button>
                    {form.camera_config.length > 1 && (
                      <button onClick={() => removeCamera(idx)} className="text-destructive/60 hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods Config */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              💳 Metode Pembayaran Aktif
            </h4>
            <div className="flex flex-wrap gap-2">
              {ALL_PAYMENT_METHODS.map((method) => {
                const isActive = form.allowed_payment_methods.includes(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        if (form.allowed_payment_methods.length <= 1) return;
                        setForm({ ...form, allowed_payment_methods: form.allowed_payment_methods.filter(m => m !== method.id) });
                      } else {
                        setForm({ ...form, allowed_payment_methods: [...form.allowed_payment_methods, method.id] });
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isActive
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Simpan Perubahan" : "Tambah Kiosk"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Kiosk List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-3">
          {kiosks.map((k: any) => {
            const cameras = Array.isArray(k.camera_config) ? (k.camera_config as unknown as CameraConfig[]) : [];
            const venueName = (k.venue as any)?.name || venueMap.get(k.venue_id) || null;
            const live = isOnlineRecently(k.last_ping);
            return (
              <div key={k.id} className="glass-card rounded-xl p-5 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {statusIcon(k.status, k.last_ping)}
                    <div>
                      <div className="text-base font-semibold text-foreground">{k.kiosk_code}</div>
                      <div className="text-sm text-muted-foreground">{k.location_name}</div>
                      {venueName && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                          <Building2 className="w-3 h-3" /> {venueName}
                        </div>
                      )}
                      {k.mac_address && (
                        <div className="text-xs font-mono text-muted-foreground mt-1">{k.mac_address}</div>
                      )}
                      {k.notes && (
                        <div className="text-xs text-muted-foreground mt-1 italic">{k.notes}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      live ? "bg-green-500/10 text-green-500" :
                      k.status === "online" ? "bg-yellow-500/10 text-yellow-500" :
                      k.status === "warning" ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {live ? "● Live" : k.status}
                    </span>
                    {isAdmin && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(k)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm("Hapus kiosk ini?")) deleteMutation.mutate(k.id); }}
                          className="text-destructive/60 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {cameras.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 ml-8">
                    {cameras.map((cam, i) => {
                      const pos = CAMERA_POSITIONS.find((p) => p.value === cam.position);
                      return (
                        <div key={i} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                          cam.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          <span>{pos?.emoji || "📷"}</span>
                          <span>{pos?.label || cam.position}</span>
                          <span className="text-[10px] opacity-60">({cam.model})</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 ml-8">
                  <Clock className="w-3 h-3" />
                  Last ping: {k.last_ping ? new Date(k.last_ping).toLocaleString("id-ID") : "Never"}
                </div>
              </div>
            );
          })}

          {kiosks.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? "Tidak ada kiosk yang cocok" : "Belum ada kiosk terdaftar"}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30">
                ← Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30">
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminKiosks;
