import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, ToggleLeft, ToggleRight } from "lucide-react";

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

interface PricingForm {
  name: string;
  grid_type: string;
  num_photos: number;
  price: number;
  is_active: boolean;
}

const emptyForm: PricingForm = { name: "", grid_type: "strip", num_photos: 3, price: 10000, is_active: true };

const AdminPricing = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingForm>(emptyForm);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_packages").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.name || !form.grid_type || form.price <= 0) {
      toast.error("Lengkapi semua field");
      return;
    }

    if (editId) {
      const { error } = await supabase.from("pricing_packages").update(form).eq("id", editId);
      if (error) { toast.error("Gagal update: " + error.message); return; }
      toast.success("Paket diperbarui");
    } else {
      const { error } = await supabase.from("pricing_packages").insert(form);
      if (error) { toast.error("Gagal simpan: " + error.message); return; }
      toast.success("Paket ditambahkan");
    }

    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
  };

  const handleEdit = (pkg: any) => {
    setForm({ name: pkg.name, grid_type: pkg.grid_type, num_photos: pkg.num_photos, price: pkg.price, is_active: pkg.is_active });
    setEditId(pkg.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket ini?")) return;
    const { error } = await supabase.from("pricing_packages").delete().eq("id", id);
    if (error) { toast.error("Gagal hapus"); return; }
    toast.success("Paket dihapus");
    queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("pricing_packages").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
    toast.success(current ? "Paket dinonaktifkan" : "Paket diaktifkan");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Packages</h1>
          <p className="text-sm text-muted-foreground">Kelola paket harga kiosk</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Tambah Paket
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{editId ? "Edit Paket" : "Paket Baru"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nama Paket</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contoh: Paket Strip 2x6" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tipe Grid</label>
              <select value={form.grid_type} onChange={(e) => setForm({ ...form, grid_type: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="strip">Strip 2×6</option>
                <option value="grid">Grid 2×2</option>
                <option value="wide">Wide 4×6</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Jumlah Foto</label>
              <input type="number" value={form.num_photos} onChange={(e) => setForm({ ...form, num_photos: parseInt(e.target.value) || 1 })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min={1} max={10} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Harga (Rupiah)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min={0} step={1000} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-border" id="pkg-active" />
            <label htmlFor="pkg-active" className="text-sm text-foreground">Aktif</label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              {editId ? "Update" : "Simpan"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-6 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nama</span>
          <span>Grid</span>
          <span>Foto</span>
          <span>Harga</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : packages && packages.length > 0 ? (
          packages.map((pkg) => (
            <div key={pkg.id} className="grid grid-cols-6 gap-4 p-4 border-b border-border/50 hover:bg-muted/20 transition-colors items-center">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{pkg.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{pkg.grid_type}</span>
              <span className="text-sm text-foreground">{pkg.num_photos}</span>
              <span className="text-sm font-mono text-primary">{formatRupiah(pkg.price)}</span>
              <button onClick={() => toggleActive(pkg.id, pkg.is_active)} className="flex items-center gap-1">
                {pkg.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                <span className={`text-xs ${pkg.is_active ? "text-success" : "text-muted-foreground"}`}>
                  {pkg.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(pkg)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">Belum ada paket</div>
        )}
      </div>
    </div>
  );
};

export default AdminPricing;
