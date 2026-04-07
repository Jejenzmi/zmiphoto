import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Monitor, Video, Image as ImageIcon, FileText,
  ExternalLink, GripVertical, Calendar, SplitSquareHorizontal,
  Filter, Eye, X, ChevronUp, ChevronDown, ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";

const MEDIA_TYPES = [
  { value: "image", label: "Gambar", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "brochure", label: "Brosur", icon: FileText },
];

const AdminPromoDisplay = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Filter state
  const [filterKiosk, setFilterKiosk] = useState<string>("all");

  // Preview state
  const [previewKiosk, setPreviewKiosk] = useState<any | null>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [kioskId, setKioskId] = useState<string>("global");
  const [duration, setDuration] = useState(10);
  const [file, setFile] = useState<File | null>(null);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  const load = async () => {
    const [{ data: promoData }, { data: kioskData }] = await Promise.all([
      supabase.from("promo_materials").select("*, kiosks(kiosk_code, location_name)").order("sort_order"),
      supabase.from("kiosks").select("id, kiosk_code, location_name"),
    ]);
    setPromos(promoData || []);
    setKiosks(kioskData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) { toast.error("Isi judul dan pilih file"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("promo-materials")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("promo-materials").getPublicUrl(path);
      const maxOrder = promos.length > 0 ? Math.max(...promos.map(p => p.sort_order)) + 1 : 0;

      const { error: insertErr } = await supabase.from("promo_materials").insert({
        title,
        media_type: mediaType,
        media_url: publicUrl,
        kiosk_id: kioskId === "global" ? null : kioskId,
        duration_seconds: duration,
        sort_order: maxOrder,
        schedule_start: scheduleStart || null,
        schedule_end: scheduleEnd || null,
      });

      if (insertErr) throw insertErr;

      toast.success("Materi promo ditambahkan");
      setTitle(""); setFile(null); setMediaType("image");
      setKioskId("global"); setDuration(10);
      setScheduleStart(""); setScheduleEnd("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, mediaUrl: string) => {
    const urlParts = mediaUrl.split("/promo-materials/");
    if (urlParts[1]) await supabase.storage.from("promo-materials").remove([urlParts[1]]);
    await supabase.from("promo_materials").delete().eq("id", id);
    toast.success("Materi dihapus");
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("promo_materials").update({ is_active: !current }).eq("id", id);
    load();
  };

  const isScheduleActive = (p: any) => {
    const now = new Date();
    if (p.schedule_start && new Date(p.schedule_start) > now) return false;
    if (p.schedule_end && new Date(p.schedule_end) < now) return false;
    return true;
  };

  // --- Drag & Drop ---
  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

    const items = [...filteredPromos];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);

    // Update sort_order in DB
    const updates = items.map((item, i) => ({ id: item.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("promo_materials").update({ sort_order: u.sort_order }).eq("id", u.id);
    }

    dragItem.current = null;
    dragOverItem.current = null;
    toast.success("Urutan diperbarui");
    load();
  };

  // Move up/down for touch/accessibility
  const moveItem = async (idx: number, direction: "up" | "down") => {
    const items = [...filteredPromos];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const a = items[idx];
    const b = items[targetIdx];
    await Promise.all([
      supabase.from("promo_materials").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("promo_materials").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    toast.success("Urutan diperbarui");
    load();
  };

  // --- Filter ---
  const filteredPromos = promos.filter(p => {
    if (filterKiosk === "all") return true;
    if (filterKiosk === "global") return !p.kiosk_id;
    return p.kiosk_id === filterKiosk || !p.kiosk_id; // show kiosk-specific + global
  });

  const previewMode = previewKiosk?._mode || "fullscreen";
  const previewUrl = previewKiosk
    ? `/display/${previewKiosk.kiosk_code}?mode=${previewMode}`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Promo Display TV</h2>
          <p className="text-sm text-muted-foreground">Kelola materi promosi untuk TV display di setiap kiosk</p>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">{promos.filter(p => p.is_active).length} aktif</span>
        </div>
      </div>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Materi Promo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Judul</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="Promo Ramadhan 2026" required />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipe Media</label>
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {MEDIA_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Kiosk</label>
            <select value={kioskId} onChange={(e) => setKioskId(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="global">🌐 Semua Kiosk</option>
              {kiosks.map((k) => (<option key={k.id} value={k.id}>{k.kiosk_code} — {k.location_name}</option>))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Durasi Tampil (detik)</label>
            <input type="number" min={3} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Jadwal Mulai (opsional)
            </label>
            <input type="datetime-local" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Jadwal Berakhir (opsional)
            </label>
            <input type="datetime-local" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">File Media</label>
          <input type="file"
            accept={mediaType === "video" ? "video/*" : "image/*,application/pdf"}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-semibold hover:file:bg-primary/20" />
        </div>

        <button type="submit" disabled={uploading}
          className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
          {uploading ? "Mengupload..." : "Upload & Simpan"}
        </button>
      </form>

      {/* Display URLs + Preview buttons */}
      {kiosks.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> URL Display TV
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Buka URL di browser TV atau klik Preview untuk melihat tampilan.</p>
          <div className="space-y-2">
            {kiosks.map((k) => {
              const kioskPromoCount = promos.filter(p => p.kiosk_id === k.id || !p.kiosk_id).filter(p => p.is_active).length;
              return (
                <div key={k.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-foreground">{k.kiosk_code}</span>
                      <span className="text-xs text-muted-foreground ml-2">{k.location_name}</span>
                    </div>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {kioskPromoCount} slide
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded text-primary font-mono">/display/{k.kiosk_code}</code>
                    <button
                      onClick={() => setPreviewKiosk(k)}
                      className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Promos list with filter */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            Materi Promo
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterKiosk}
              onChange={(e) => setFilterKiosk(e.target.value)}
              className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Semua</option>
              <option value="global">🌐 Global saja</option>
              {kiosks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kiosk_code} — {k.location_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredPromos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {filterKiosk === "all" ? "Belum ada materi promo" : "Tidak ada promo untuk kiosk ini"}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Drag untuk mengatur urutan, atau gunakan tombol ↑↓
            </p>
            {filteredPromos.map((p, idx) => {
              const typeInfo = MEDIA_TYPES.find((t) => t.value === p.media_type);
              const Icon = typeInfo?.icon || ImageIcon;
              const scheduleOk = isScheduleActive(p);
              const isDragging = dragIdx === idx;
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex items-center gap-3 py-3 px-2 rounded-lg border transition-all ${
                    isDragging
                      ? "border-primary bg-primary/5 opacity-70 scale-[0.98]"
                      : "border-transparent hover:bg-muted/50"
                  } ${!scheduleOk ? "opacity-50" : ""}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0" />

                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveItem(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, "down")}
                      disabled={idx === filteredPromos.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {p.media_type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-5 h-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <img src={p.media_url} alt={p.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{p.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{p.sort_order}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        p.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                      {!scheduleOk && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                          Dijadwalkan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Icon className="w-3 h-3" /> {typeInfo?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{p.duration_seconds}s</span>
                      <span className="text-[10px] text-muted-foreground">
                        {p.kiosk_id ? (p.kiosks as any)?.kiosk_code || "Kiosk" : "🌐 Semua"}
                      </span>
                      {(p.schedule_start || p.schedule_end) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {p.schedule_start ? format(new Date(p.schedule_start), "dd/MM/yy HH:mm") : "∞"}
                          {" → "}
                          {p.schedule_end ? format(new Date(p.schedule_end), "dd/MM/yy HH:mm") : "∞"}
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => toggleActive(p.id, p.is_active)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 shrink-0">
                    {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button onClick={() => handleDelete(p.id, p.media_url)}
                    className="text-destructive hover:text-destructive/80 transition-colors p-1 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewKiosk && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Preview: {previewKiosk.kiosk_code}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{previewKiosk.location_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/display/${previewKiosk.kiosk_code}?mode=fullscreen`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Buka fullscreen
                </a>
                <button
                  onClick={() => setPreviewKiosk(null)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* iframe preview */}
            <div className="relative bg-foreground/5" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={`Display preview: ${previewKiosk.kiosk_code}`}
              />
            </div>

            {/* Modal footer info */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {promos.filter(p => (p.kiosk_id === previewKiosk.id || !p.kiosk_id) && p.is_active).length} slide aktif untuk kiosk ini
              </span>
              <div className="flex gap-2">
                {["fullscreen", "split", "grid", "ticker"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreviewKiosk({ ...previewKiosk, _mode: m })}
                    className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-primary/10 hover:text-primary transition-colors capitalize"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromoDisplay;
