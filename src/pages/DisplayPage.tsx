import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Monitor, SplitSquareHorizontal, Layout, Maximize, QrCode } from "lucide-react";

interface Slide {
  id: string;
  type: "photo" | "promo";
  url: string;
  title?: string;
  mediaType?: string;
  duration: number;
}

type DisplayMode = "fullscreen" | "split" | "grid" | "ticker";

const LAYOUT_OPTIONS: { id: DisplayMode; label: string; desc: string; icon: any }[] = [
  { id: "fullscreen", label: "Fullscreen", desc: "Slideshow penuh layar, satu konten per waktu", icon: Maximize },
  { id: "split", label: "Split Screen", desc: "70% slideshow + 30% QR code & info kiosk", icon: SplitSquareHorizontal },
  { id: "grid", label: "Photo Grid", desc: "Tampilan grid foto terbaru dengan branding", icon: Layout },
  { id: "ticker", label: "Slideshow + Ticker", desc: "Fullscreen slideshow dengan ticker promo di bawah", icon: Monitor },
];

const DisplayPage = () => {
  const { kioskCode } = useParams<{ kioskCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as DisplayMode) || null;
  const [mode, setMode] = useState<DisplayMode | null>(initialMode);
  const [showPicker, setShowPicker] = useState(!initialMode);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kioskName, setKioskName] = useState("");
  const [recentPhotoCodes, setRecentPhotoCodes] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second for split mode
  useEffect(() => {
    if (mode !== "split") return;
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [mode]);

  const loadSlides = useCallback(async () => {
    if (!kioskCode) return;

    const { data: kiosk } = await supabase
      .from("kiosks")
      .select("id, location_name, venue_id")
      .eq("kiosk_code", kioskCode)
      .maybeSingle();

    if (!kiosk) { setLoading(false); return; }
    setKioskName(kiosk.location_name);

    const photoQuery = supabase
      .from("photo_sessions")
      .select("id, final_image_url, short_code, created_at")
      .not("final_image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (kiosk.venue_id) photoQuery.eq("venue_id", kiosk.venue_id);
    const { data: photos } = await photoQuery;

    // Filter promos by schedule
    const now = new Date().toISOString();
    const { data: promos } = await supabase
      .from("promo_materials")
      .select("*")
      .eq("is_active", true)
      .or(`kiosk_id.eq.${kiosk.id},kiosk_id.is.null`)
      .or(`schedule_start.is.null,schedule_start.lte.${now}`)
      .or(`schedule_end.is.null,schedule_end.gte.${now}`)
      .order("sort_order", { ascending: true });

    // Store recent photo codes for QR panel
    setRecentPhotoCodes((photos || []).slice(0, 5).map(p => p.short_code));

    const photoSlides: Slide[] = (photos || [])
      .filter((p) => p.final_image_url)
      .map((p) => ({
        id: `photo-${p.id}`,
        type: "photo" as const,
        url: p.final_image_url!,
        title: p.short_code,
        duration: 6,
      }));

    const promoSlides: Slide[] = (promos || []).map((p) => ({
      id: `promo-${p.id}`,
      type: "promo" as const,
      url: p.media_url,
      title: p.title,
      mediaType: p.media_type,
      duration: p.duration_seconds,
    }));

    const merged: Slide[] = [];
    let pi = 0, pri = 0;
    while (pi < photoSlides.length || pri < promoSlides.length) {
      for (let i = 0; i < 3 && pi < photoSlides.length; i++, pi++) merged.push(photoSlides[pi]);
      if (pri < promoSlides.length) merged.push(promoSlides[pri++]);
    }

    if (merged.length === 0) {
      merged.push({ id: "placeholder", type: "promo", url: "", title: "ZMI Photobox", mediaType: "image", duration: 10 });
    }

    setSlides(merged);
    setLoading(false);
  }, [kioskCode]);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  useEffect(() => {
    const channel = supabase
      .channel("display-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_sessions" }, () => loadSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_materials" }, () => loadSlides())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSlides]);

  useEffect(() => {
    if (slides.length === 0) return;
    const current = slides[currentIndex];
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, (current?.duration || 8) * 1000);
    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  useEffect(() => {
    const interval = setInterval(loadSlides, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadSlides]);

  const selectMode = (m: DisplayMode) => {
    setMode(m);
    setShowPicker(false);
    setSearchParams({ mode: m });
  };

  // ===== LAYOUT PICKER =====
  if (showPicker) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="text-4xl font-black text-primary mb-2">ZMI</div>
            <div className="text-lg text-white/60">Photobox Display</div>
            <div className="text-sm text-white/30 mt-1">
              Kiosk: <span className="text-primary font-mono">{kioskCode}</span>
            </div>
            <p className="text-xs text-white/40 mt-4">Pilih layout untuk TV display</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {LAYOUT_OPTIONS.map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectMode(opt.id)}
                className="border border-white/10 rounded-2xl p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <opt.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-base font-bold text-white mb-1">{opt.label}</h3>
                <p className="text-xs text-white/40">{opt.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-black text-primary mb-4">ZMI</div>
          <div className="text-2xl text-white/60">Photobox</div>
          <div className="text-sm text-white/30 mt-2">Kiosk tidak ditemukan</div>
        </div>
      </div>
    );
  }

  const current = slides[currentIndex] || slides[0];
  const galleryUrl = `${window.location.origin}/gallery`;
  const photoSlides = slides.filter(s => s.type === "photo");
  const promoSlides = slides.filter(s => s.type === "promo");

  // Render slide content (shared between fullscreen, split, ticker)
  const renderSlide = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {current.url === "" ? (
          <div className="text-center">
            <div className="text-6xl font-black text-primary mb-4">ZMI</div>
            <div className="text-2xl text-white/60">Photobox</div>
            <div className="text-sm text-white/30 mt-2">{kioskName}</div>
          </div>
        ) : current.mediaType === "video" ? (
          <video
            src={current.url}
            autoPlay muted playsInline
            className="w-full h-full object-contain"
            onEnded={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
          />
        ) : (
          <img src={current.url} alt={current.title || ""} className="w-full h-full object-contain" />
        )}

        {current.type === "photo" && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-8">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-widest">Captured at</span>
                <h3 className="text-xl font-bold text-white mt-1">{kioskName}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-primary/80">#{current.title}</span>
                <div className="text-sm font-bold text-white/80 mt-1">ZMI Photobox</div>
              </div>
            </div>
          </div>
        )}

        {current.type === "promo" && current.title && current.url !== "" && (
          <div className="absolute bottom-8 left-8">
            <span className="bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-full">
              {current.title}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const renderProgressBar = () => (
    <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-white/10">
      <motion.div
        key={currentIndex}
        className="h-full bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: current.duration, ease: "linear" }}
      />
    </div>
  );

  // ===== GRID MODE =====
  if (mode === "grid") {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden cursor-none select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-black text-primary">ZMI</div>
            <div className="text-sm text-white/40">{kioskName}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-white font-mono">
              {currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={galleryUrl} size={48} level="L" bgColor="#FFFFFF" fgColor="#000000" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="grid grid-cols-4 grid-rows-3 gap-3 h-full">
            {photoSlides.slice(0, 12).map((slide, i) => (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-xl overflow-hidden bg-white/5"
              >
                <img src={slide.url} alt={slide.title || ""} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-[10px] font-mono text-primary/80">#{slide.title}</span>
                </div>
              </motion.div>
            ))}
            {photoSlides.length < 12 && Array.from({ length: 12 - photoSlides.length }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-xl bg-white/5 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer ticker for promos */}
        {promoSlides.length > 0 && (
          <div className="border-t border-white/10 px-8 py-3 flex items-center gap-4 overflow-hidden">
            <span className="text-[10px] text-primary font-semibold uppercase tracking-widest shrink-0">Promo</span>
            <motion.div
              className="flex gap-8 whitespace-nowrap"
              animate={{ x: [0, -1000] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {promoSlides.concat(promoSlides).map((p, i) => (
                <span key={`${p.id}-${i}`} className="text-sm text-white/50">{p.title}</span>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ===== TICKER MODE =====
  if (mode === "ticker") {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden cursor-none select-none flex flex-col">
        {/* Main slideshow */}
        <div className="relative flex-1">
          {renderProgressBar()}
          {renderSlide()}
        </div>

        {/* Bottom ticker bar */}
        <div className="h-16 bg-gradient-to-r from-primary/20 via-black to-primary/20 border-t border-white/10 flex items-center overflow-hidden">
          <div className="shrink-0 bg-primary px-4 h-full flex items-center">
            <span className="text-xs font-bold text-primary-foreground uppercase tracking-widest">LIVE</span>
          </div>
          <motion.div
            className="flex gap-12 whitespace-nowrap px-6"
            animate={{ x: [0, -1500] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {slides.concat(slides).map((s, i) => (
              <span key={`${s.id}-ticker-${i}`} className="text-sm text-white/60 flex items-center gap-2">
                {s.type === "photo" ? (
                  <>📸 Foto #{s.title} di {kioskName}</>
                ) : (
                  <>🎯 {s.title}</>
                )}
              </span>
            ))}
          </motion.div>
          <div className="shrink-0 px-4 flex items-center gap-3 border-l border-white/10 h-full">
            <div className="bg-white p-1.5 rounded">
              <QRCodeSVG value={galleryUrl} size={36} level="L" bgColor="#FFFFFF" fgColor="#000000" />
            </div>
            <div className="text-xs text-white/40 font-mono">
              {currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== SPLIT-SCREEN MODE =====
  if (mode === "split") {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden cursor-none select-none flex">
        <div className="relative w-[70%] h-full">
          {renderProgressBar()}
          {renderSlide()}
        </div>

        <div className="w-[30%] h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-l border-white/10 flex flex-col items-center justify-between py-8 px-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-white font-mono tracking-wider">
              {currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{kioskName}</div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-1">Scan & Download</h3>
              <p className="text-xs text-white/50">Scan QR code untuk lihat & download foto kamu</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-primary/20">
              <QRCodeSVG value={galleryUrl} size={180} level="H" includeMargin={false} bgColor="#FFFFFF" fgColor="#000000" />
            </div>
            <p className="text-[10px] text-white/30 font-mono">{galleryUrl}</p>

            {recentPhotoCodes.length > 0 && (
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Kode Foto Terbaru</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {recentPhotoCodes.map((code) => (
                    <span key={code} className="text-xs font-mono bg-white/10 text-primary px-2.5 py-1 rounded-full">{code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-2xl font-black text-primary">ZMI</div>
            <div className="text-[10px] text-white/20 tracking-[0.3em] uppercase mt-1">Photobox</div>
          </div>
        </div>
      </div>
    );
  }

  // ===== FULLSCREEN MODE (default) =====
  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none select-none">
      {renderProgressBar()}

      <div className="absolute top-4 right-4 z-20 flex gap-1">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-primary" : "bg-white/20"}`}
          />
        ))}
      </div>

      {renderSlide()}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <span className="text-[10px] text-white/15 tracking-[0.3em] uppercase">ZMI Photobox Display</span>
      </div>
    </div>
  );
};

export default DisplayPage;
