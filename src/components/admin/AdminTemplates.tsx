import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, ToggleLeft, ToggleRight, Upload, Loader2, Pencil, X, Save } from "lucide-react";
import { toast } from "sonner";
import SlotConfigEditor, { type SlotRect } from "@/components/admin/SlotConfigEditor";

// Fallback images removed — all frames should be uploaded via admin panel

const GRID_TYPES = [
  { value: "strip-2x6", label: "Strip 2×6", photos: 3, orientation: "portrait", w: 600, h: 1800, cols: 1 },
  { value: "grid-2x2", label: "Grid 2×2", photos: 4, orientation: "portrait", w: 1200, h: 1200, cols: 2 },
  { value: "single-4x6", label: "Single 4×6", photos: 1, orientation: "portrait", w: 1080, h: 1440, cols: 1 },
  { value: "panoramic", label: "Panoramic", photos: 1, orientation: "landscape", w: 1920, h: 1080, cols: 1 },
  { value: "grid-landscape", label: "Grid Landscape", photos: 4, orientation: "landscape", w: 1800, h: 1200, cols: 2 },
  { value: "strip-landscape", label: "Strip Landscape", photos: 3, orientation: "landscape", w: 1800, h: 600, cols: 3 },
  { value: "magazine-cover", label: "Magazine Cover", photos: 1, orientation: "portrait", w: 1080, h: 1440, cols: 1 },
  { value: "magazine-spread", label: "Magazine Spread", photos: 4, orientation: "landscape", w: 1920, h: 1080, cols: 2 },
];

const emptyForm = {
  name: "",
  event_name: "",
  grid_type: "strip-2x6",
  num_photos: 3,
  orientation: "portrait",
  canvas_width: 600,
  canvas_height: 1800,
  grid_cols: 1,
  price: 10000,
  description: "",
  slot_config: [] as SlotRect[],
};

const AdminTemplates = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingAssetUrl, setExistingAssetUrl] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success("Template diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success("Template dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormFile(null);
    setExistingAssetUrl(null);
    setShowForm(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name || "",
      event_name: t.event_name || "",
      grid_type: t.grid_type || "strip-2x6",
      num_photos: t.num_photos || 3,
      orientation: t.orientation || "portrait",
      canvas_width: t.canvas_width || 600,
      canvas_height: t.canvas_height || 1800,
      grid_cols: t.grid_cols || 1,
      price: t.price || 10000,
      description: t.description || "",
      slot_config: (t.slot_config as SlotRect[]) || [],
    });
    setFormFile(null);
    setExistingAssetUrl(t.asset_url || null);
    setShowForm(true);
  };

  const handleGridTypeChange = (gridType: string) => {
    const preset = GRID_TYPES.find(g => g.value === gridType);
    if (preset) {
      setForm({
        ...form,
        grid_type: gridType,
        num_photos: preset.photos,
        orientation: preset.orientation,
        canvas_width: preset.w,
        canvas_height: preset.h,
        grid_cols: preset.cols,
      });
    } else {
      setForm({ ...form, grid_type: gridType });
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nama template wajib diisi");
    setUploading(true);

    let assetUrl: string | null = existingAssetUrl;

    if (formFile) {
      const ext = formFile.name.split(".").pop();
      const path = `frames/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("template-assets").upload(path, formFile);
      if (uploadErr) {
        toast.error("Upload gagal: " + uploadErr.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("template-assets").getPublicUrl(path);
      assetUrl = urlData.publicUrl;
    }

    // Sync num_photos with slot_config count if slots are configured
    const effectiveNumPhotos = form.slot_config.length > 0 ? form.slot_config.length : form.num_photos;

    const payload = {
      name: form.name,
      event_name: form.event_name || null,
      grid_type: form.grid_type,
      num_photos: effectiveNumPhotos,
      orientation: form.orientation,
      canvas_width: form.canvas_width,
      canvas_height: form.canvas_height,
      grid_cols: form.grid_cols,
      price: form.price,
      description: form.description || null,
      asset_url: assetUrl,
      slot_config: form.slot_config.length > 0 ? form.slot_config : null,
      is_active: true,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("templates").update(payload as any).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("templates").insert(payload as any));
    }

    setUploading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Template diperbarui ✏️" : "Template ditambahkan");
      setShowForm(false);
      setEditingId(null);
      setFormFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Template</h1>
          <p className="text-sm text-muted-foreground">Kelola bingkai dan template photobox</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Tambah Template
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{editingId ? "Edit Template" : "Template Baru"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nama Template *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contoh: Christmas 2026" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Event</label>
              <input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contoh: Christmas" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Grid Type</label>
              <select value={form.grid_type} onChange={(e) => handleGridTypeChange(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {GRID_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Harga (Rp)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Jumlah Foto</label>
              <input type="number" value={form.num_photos} onChange={(e) => setForm({ ...form, num_photos: parseInt(e.target.value) || 1 })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                min={1} max={10} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Orientasi</label>
              <select value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Deskripsi</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Deskripsi template..." />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Upload Bingkai</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="w-full bg-muted border border-dashed border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {formFile ? formFile.name : existingAssetUrl ? "Ganti file..." : "Pilih file..."}
              </button>
              {existingAssetUrl && !formFile && (
                <div className="text-[10px] text-muted-foreground mt-1">File saat ini sudah ada. Upload baru untuk mengganti.</div>
              )}
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Canvas W</label>
                <input type="number" value={form.canvas_width} onChange={(e) => setForm({ ...form, canvas_width: parseInt(e.target.value) || 600 })}
                  className="w-20 bg-muted border border-border rounded-lg px-2 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <span className="text-muted-foreground pb-2">×</span>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Canvas H</label>
                <input type="number" value={form.canvas_height} onChange={(e) => setForm({ ...form, canvas_height: parseInt(e.target.value) || 1800 })}
                  className="w-20 bg-muted border border-border rounded-lg px-2 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Cols</label>
                <input type="number" value={form.grid_cols} onChange={(e) => setForm({ ...form, grid_cols: parseInt(e.target.value) || 1 })}
                  className="w-14 bg-muted border border-border rounded-lg px-2 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  min={1} max={4} />
              </div>
            </div>
          </div>
          {/* Slot Config Editor */}
          <div className="mt-4">
            <SlotConfigEditor
              slots={form.slot_config}
              onChange={(newSlots) => setForm({ ...form, slot_config: newSlots, num_photos: newSlots.length > 0 ? newSlots.length : form.num_photos })}
              numPhotos={form.num_photos}
              canvasWidth={form.canvas_width}
              canvasHeight={form.canvas_height}
              frameUrl={formFile ? URL.createObjectURL(formFile) : existingAssetUrl}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={uploading}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Simpan Perubahan" : "Simpan"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(templates || []).map((t: any) => (
            <div key={t.id} className="glass-card rounded-xl p-4 group">
              <div className="w-full aspect-[3/4] bg-muted rounded-lg mb-3 overflow-hidden">
                {t.asset_url ? (
                  <img src={t.asset_url} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">🖼️</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {t.grid_type} · {t.num_photos || "?"} foto · Rp {((t.price || 0) / 1000).toFixed(0)}K
                {t.event_name ? ` · ${t.event_name}` : ""}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t.orientation || "portrait"} · {t.canvas_width || "?"}×{t.canvas_height || "?"}
              </div>
              {isAdmin && (
                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => toggleMutation.mutate({ id: t.id, is_active: !t.is_active })}
                    className={`flex items-center gap-1.5 text-xs font-medium ${t.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                    {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {t.is_active ? "Active" : "Inactive"}
                  </button>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm("Hapus template ini?")) deleteMutation.mutate(t.id); }}
                      className="text-destructive/60 hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTemplates;
