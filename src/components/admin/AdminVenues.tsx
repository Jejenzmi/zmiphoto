import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Building2, MapPin, Phone, Mail, Edit2, Check, X, Calendar } from "lucide-react";

const AdminVenues = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "resto", address: "", contact_phone: "", contact_email: "", contract_start: "", contract_end: "" });

  const VENUE_TYPES = [
    { value: "resto", label: "Restoran", emoji: "🍽️" },
    { value: "cafe", label: "Kafe", emoji: "☕" },
    { value: "hotel", label: "Hotel", emoji: "🏨" },
    { value: "wisata", label: "Tempat Wisata", emoji: "🏖️" },
    { value: "event", label: "Event Space", emoji: "🎪" },
    { value: "mall", label: "Mall", emoji: "🏬" },
  ];

  const load = async () => {
    const { data } = await supabase.from("venues").select("*").order("created_at", { ascending: false });
    setVenues(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", type: "resto", address: "", contact_phone: "", contact_email: "", contract_start: "", contract_end: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      name: v.name || "",
      type: v.type || "resto",
      address: v.address || "",
      contact_phone: v.contact_phone || "",
      contact_email: v.contact_email || "",
      contract_start: v.contract_start || "",
      contract_end: v.contract_end || "",
    });
    setShowForm(true);
  };

  const saveVenue = async () => {
    if (!form.name.trim()) { toast.error("Nama venue wajib diisi"); return; }
    const payload = {
      name: form.name,
      type: form.type,
      address: form.address || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("venues").update(payload as any).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("venues").insert(payload as any));
    }
    if (error) { toast.error("Gagal menyimpan venue", { description: error.message }); return; }
    toast.success(editingId ? "Venue diperbarui! ✏️" : "Venue ditambahkan! 🏢");
    resetForm();
    load();
  };

  const deleteVenue = async (id: string) => {
    if (!confirm("Hapus venue ini?")) return;
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) { toast.error("Gagal hapus venue"); return; }
    toast.success("Venue dihapus");
    load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from("venues").update({ is_active: !isActive }).eq("id", id);
    load();
  };

  const isContractExpired = (end: string | null) => {
    if (!end) return false;
    return new Date(end) < new Date();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Venue Management</h2>
          <p className="text-sm text-muted-foreground">Kelola resto, kafe, hotel, dan tempat wisata partner</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Tambah Venue
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit Venue" : "Venue Baru"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Venue"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Telepon"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="Email"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Mulai Kontrak</label>
                <input type="date" value={form.contract_start} onChange={(e) => setForm({ ...form, contract_start: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Akhir Kontrak</label>
                <input type="date" value={form.contract_end} onChange={(e) => setForm({ ...form, contract_end: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveVenue} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {editingId ? "Simpan Perubahan" : "Simpan"}
            </button>
            <button onClick={resetForm} className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm hover:text-foreground flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          </div>
        </div>
      )}

      {/* Venue list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {venues.map((v) => {
          const typeInfo = VENUE_TYPES.find(t => t.value === v.type);
          const expired = isContractExpired(v.contract_end);
          return (
            <div key={v.id} className={`glass-card rounded-xl p-4 ${!v.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{typeInfo?.emoji || "🏢"}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{v.name}</h3>
                    <span className="text-xs text-muted-foreground capitalize">{typeInfo?.label || v.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(v.id, v.is_active)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${v.is_active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    {v.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                  <button onClick={() => openEdit(v)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteVenue(v.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {v.address && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3 h-3" /> {v.address}
                </div>
              )}
              {v.contact_phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Phone className="w-3 h-3" /> {v.contact_phone}
                </div>
              )}
              {v.contact_email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Mail className="w-3 h-3" /> {v.contact_email}
                </div>
              )}
              {(v.contract_start || v.contract_end) && (
                <div className={`flex items-center gap-1.5 text-xs mt-1 ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                  <Calendar className="w-3 h-3" />
                  {v.contract_start && new Date(v.contract_start).toLocaleDateString("id-ID")}
                  {v.contract_start && v.contract_end && " — "}
                  {v.contract_end && new Date(v.contract_end).toLocaleDateString("id-ID")}
                  {expired && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full ml-1">Expired</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {venues.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada venue. Tambahkan venue pertama!</p>
        </div>
      )}
    </div>
  );
};

export default AdminVenues;
