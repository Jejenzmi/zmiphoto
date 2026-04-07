import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Send, Gift, Heart, Star, Sparkles, Loader2, Image as ImageIcon, MessageCircle, Video, Play, PackageCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const GIFT_TYPES = [
  { id: "heart", icon: "❤️", label: "Love" },
  { id: "star", icon: "⭐", label: "Star" },
  { id: "fire", icon: "🔥", label: "Fire" },
  { id: "clap", icon: "👏", label: "Clap" },
  { id: "party", icon: "🎉", label: "Party" },
  { id: "flower", icon: "🌸", label: "Bunga" },
];

const GalleryPage = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gift state
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [giftSender, setGiftSender] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [gifts, setGifts] = useState<any[]>([]);


  useEffect(() => {
    if (initialCode) handleSearch(initialCode);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime gifts
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("gifts-" + session.short_code)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gifts", filter: `session_code=eq.${session.short_code}` },
        (payload) => {
          const g = payload.new as any;
          setGifts((prev) => [...prev, g]);
          toast(`${GIFT_TYPES.find(t => t.id === g.gift_type)?.icon || "🎁"} Gift dari ${g.sender_name}!`, { description: g.message || "" });
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const handleSearch = async (searchCode?: string) => {
    const trimmed = (searchCode || code).trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setSession(null);
    setMessages([]);
    setGifts([]);

    const { data, error: err } = await supabase
      .from("photo_sessions")
      .select("*, template:templates(name, grid_type)")
      .eq("short_code", trimmed)
      .maybeSingle();

    setLoading(false);
    if (err) { setError("Terjadi kesalahan."); return; }
    if (!data) { setError("Kode tidak ditemukan."); return; }

    setSession({
      short_code: data.short_code,
      filter_applied: data.filter_applied,
      final_image_url: data.final_image_url,
      gif_url: data.gif_url,
      raw_image_urls: data.raw_image_urls,
      created_at: data.created_at,
      template: data.template as any,
      boomerang_url: (data as any).boomerang_url,
      live_photo_url: (data as any).live_photo_url,
      ai_angles_urls: (data as any).ai_angles_urls,
    });

    const { data: existingGifts } = await supabase.from("gifts").select("*").eq("session_code", trimmed).order("created_at");
    setGifts(existingGifts || []);

    setMessages([{ role: "assistant", content: `Hai! 👋 Selamat datang di ZMI Gallery!\n\nFoto kamu dengan kode **${trimmed}** sudah siap. Kamu bisa:\n- 📥 Download foto di atas\n- 🎁 Kirim gift ke teman\n- 💬 Chat dengan aku!\n\nAda yang bisa aku bantu? 😊` }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages, sessionCode: session.short_code }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Terlalu banyak request, coba lagi nanti");
        else if (resp.status === 402) toast.error("Kredit habis");
        throw new Error("Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length === allMessages.length + 1) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      if (!assistantSoFar) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, ada gangguan. Coba lagi ya! 😅" }]);
      }
    }
    setIsStreaming(false);
  };

  const sendGift = async (giftType: string) => {
    if (!session) return;
    const { error } = await supabase.from("gifts").insert({
      session_code: session.short_code,
      sender_name: giftSender || "Anonim",
      message: giftMessage || null,
      gift_type: giftType,
    });
    if (error) { toast.error("Gagal kirim gift"); return; }
    toast.success(`${GIFT_TYPES.find(t => t.id === giftType)?.icon} Gift terkirim!`);
    setGiftMessage("");
    setShowGiftPanel(false);
  };

  const allDownloadableMedia: { url: string; filename: string; label: string }[] = [];
  if (session) {
    if (session.final_image_url) allDownloadableMedia.push({ url: session.final_image_url, filename: `ZMI-${session.short_code}-composite.jpg`, label: "Foto Utama" });
    if (session.raw_image_urls?.length) {
      session.raw_image_urls.forEach((url: string, i: number) => {
        allDownloadableMedia.push({ url, filename: `ZMI-${session.short_code}-foto-${i + 1}.jpg`, label: `Foto ${i + 1}` });
      });
    }
    if (session.gif_url) allDownloadableMedia.push({ url: session.gif_url, filename: `ZMI-${session.short_code}-receipt.png`, label: "Photo Receipt" });
    if (session.boomerang_url) allDownloadableMedia.push({ url: session.boomerang_url, filename: `ZMI-${session.short_code}-boomerang.gif`, label: "Boomerang" });
    if (session.live_photo_url) allDownloadableMedia.push({ url: session.live_photo_url, filename: `ZMI-${session.short_code}-livephoto.webm`, label: "Live Photo" });
    if (session.ai_angles_urls) {
      Object.entries(session.ai_angles_urls).forEach(([angle, url]) => {
        allDownloadableMedia.push({ url: url as string, filename: `ZMI-${session.short_code}-ai-${angle}.jpg`, label: `AI ${AI_ANGLE_LABELS[angle] || angle}` });
      });
    }
  }

  const [downloading, setDownloading] = useState(false);

  const downloadAllMedia = async () => {
    if (allDownloadableMedia.length === 0) return;
    setDownloading(true);
    toast.info(`📥 Mendownload ${allDownloadableMedia.length} file...`);

    for (const media of allDownloadableMedia) {
      try {
        const resp = await fetch(media.url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = media.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Download failed for ${media.label}:`, e);
      }
    }

    setDownloading(false);
    toast.success(`✅ ${allDownloadableMedia.length} file berhasil didownload!`);
  };

  const hasExtras = session?.boomerang_url || session?.live_photo_url || (session?.ai_angles_urls && Object.keys(session.ai_angles_urls).length > 0);
  const galleryUrl = typeof window !== "undefined" ? `${window.location.origin}/gallery?code=${session?.short_code || ""}` : "";

  const AI_ANGLE_LABELS: Record<string, string> = { left: "⬅️ Kiri", top: "⬆️ Atas", bottom: "⬇️ Bawah", right: "➡️ Kanan" };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-3 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">ZMI Gallery</h1>
            {session && <p className="text-[10px] font-mono text-muted-foreground">{session.short_code}</p>}
          </div>
          {session && (
            <button onClick={() => setShowGiftPanel(!showGiftPanel)}
              className="flex items-center gap-1.5 text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-full hover:bg-accent/30 transition-colors">
              <Gift className="w-3.5 h-3.5" /> Gift
              {gifts.length > 0 && <span className="bg-accent text-accent-foreground text-[10px] px-1.5 rounded-full">{gifts.length}</span>}
            </button>
          )}
        </div>
      </header>

      {!session ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-sm">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">ZMI Gallery Chat</h2>
            <p className="text-sm text-muted-foreground mb-8">Masukkan kode dari struk/layar kiosk</p>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: ZMI001" maxLength={8}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary mb-4" />
            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            <button onClick={() => handleSearch()} disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Masuk Gallery
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
          {/* All media in one unified view */}
          <div className="p-4 border-b border-border shrink-0 space-y-3">
            {/* Main photo + QR */}
            <div className="flex gap-4 items-center">
              <div className="w-20 h-28 bg-muted rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {session.final_image_url ? (
                  <img src={session.final_image_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{session.template?.name || "Photo Session"}</p>
                <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                {session.filter_applied && <p className="text-xs text-muted-foreground">Filter: {session.filter_applied}</p>}
                <p className="text-xs text-muted-foreground mt-1">{allDownloadableMedia.length} file tersedia</p>
              </div>
              <div className="shrink-0">
                <QRCodeSVG value={galleryUrl} size={64} bgColor="transparent" fgColor="hsl(220, 25%, 12%)" level="M" />
                <p className="text-[8px] text-muted-foreground text-center mt-1">Share</p>
              </div>
            </div>

            {/* Download All button */}
            <button onClick={downloadAllMedia} disabled={downloading || allDownloadableMedia.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Download Semua ({allDownloadableMedia.length} file)
            </button>

            {/* Individual media list */}
            <div className="space-y-2">
              {/* Raw photos grid */}
              {session.raw_image_urls?.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {session.raw_image_urls.map((url: string, i: number) => (
                    <a key={i} href={url} download={`ZMI-${session.short_code}-foto-${i + 1}.jpg`} target="_blank" rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      <span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono text-white bg-black/50 px-1 rounded">{i + 1}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Photo Receipt */}
              {session.gif_url && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={session.gif_url} alt="Photo Receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">📸 Photo Receipt</p>
                    <p className="text-[10px] text-muted-foreground">Photostrip dengan foto</p>
                  </div>
                  <a href={session.gif_url} download={`ZMI-Receipt-${session.short_code}.png`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg hover:opacity-90">
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              )}

              {/* Boomerang */}
              {session.boomerang_url && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={session.boomerang_url} alt="Boomerang" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">🎬 Boomerang GIF</p>
                    <p className="text-[10px] text-muted-foreground">Animasi bounce</p>
                  </div>
                  <a href={session.boomerang_url} download={`ZMI-Boomerang-${session.short_code}.gif`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg hover:opacity-90">
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              )}

              {/* Live Photo */}
              {session.live_photo_url && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <video src={session.live_photo_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">🎥 Live Photo / Video Pendek</p>
                    <p className="text-[10px] text-muted-foreground">Video 3 detik</p>
                  </div>
                  <a href={session.live_photo_url} download={`ZMI-LivePhoto-${session.short_code}.webm`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg hover:opacity-90">
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* AI Angles */}
              {session.ai_angles_urls && Object.keys(session.ai_angles_urls).length > 0 && (
                <div className="glass-card rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">📐 AI Potret 4 Sudut</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(session.ai_angles_urls).map(([angleId, url]) => (
                      <a key={angleId} href={url as string} download={`ZMI-${session.short_code}-ai-${angleId}.jpg`} target="_blank" rel="noopener noreferrer"
                        className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img src={url as string} alt={angleId} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Download className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-[8px] text-muted-foreground text-center mt-0.5">{AI_ANGLE_LABELS[angleId] || angleId}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* GIF */}
              {session.gif_url && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={session.gif_url} alt="GIF" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">🎞️ GIF Animasi</p>
                  </div>
                  <a href={session.gif_url} download={`ZMI-${session.short_code}.gif`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg hover:opacity-90">
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Gift rain */}
            {gifts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {gifts.slice(-20).map((g) => (
                  <motion.span key={g.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-lg" title={`${g.sender_name}: ${g.message || ""}`}>
                    {GIFT_TYPES.find(t => t.id === g.gift_type)?.icon || "🎁"}
                  </motion.span>
                ))}
              </div>
            )}
          </div>

          {/* Gift panel */}
          <AnimatePresence>
            {showGiftPanel && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="border-b border-border overflow-hidden">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Gift className="w-4 h-4 text-accent" /> Kirim Gift</h3>
                  <input value={giftSender} onChange={(e) => setGiftSender(e.target.value)} placeholder="Nama kamu (opsional)"
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                  <input value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Pesan singkat..."
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                  <div className="flex gap-2">
                    {GIFT_TYPES.map((g) => (
                      <button key={g.id} onClick={() => sendGift(g.id)}
                        className="flex-1 glass-card rounded-lg py-2 text-center hover:bg-accent/10 transition-colors">
                        <div className="text-xl">{g.icon}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{g.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass-card text-foreground rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex gap-2 items-center">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ketik pesan..."
                disabled={isStreaming}
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
              <button onClick={sendMessage} disabled={isStreaming || !input.trim()}
                className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
