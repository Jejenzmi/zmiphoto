import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, Play, RotateCcw } from "lucide-react";
import { createBoomerangGif } from "@/utils/gifEncoder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BoomerangPreviewProps {
  photos: string[];
  shortCode: string;
}

const BoomerangPreview = ({ photos, shortCode }: BoomerangPreviewProps) => {
  const [generating, setGenerating] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const bounceSequence = [...photos];
  if (photos.length > 2) {
    for (let i = photos.length - 2; i >= 1; i--) bounceSequence.push(photos[i]);
  } else if (photos.length === 2) {
    bounceSequence.push(photos[0]);
  }

  const startPreview = () => {
    setPlaying(true);
    setCurrentFrame(0);
  };

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % bounceSequence.length);
    }, 250);
    return () => clearInterval(interval);
  }, [playing, bounceSequence.length]);

  const uploadAndSave = async (blob: Blob) => {
    try {
      const filename = `${shortCode}/boomerang.gif`;
      const { data, error } = await supabase.storage.from("photo-captures").upload(filename, blob, {
        contentType: "image/gif",
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("photo-captures").getPublicUrl(data.path);
      await supabase.from("photo_sessions").update({ boomerang_url: urlData.publicUrl } as any).eq("short_code", shortCode);
    } catch (e) {
      console.error("Boomerang upload failed:", e);
    }
  };

  const generateGif = async () => {
    if (photos.length < 2) {
      toast.error("Minimal 2 foto untuk buat boomerang");
      return;
    }
    setGenerating(true);
    try {
      const blob = await createBoomerangGif(photos, 480, 480, 200);
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      toast.success("Boomerang GIF berhasil dibuat! 🎬");
      // Upload in background
      uploadAndSave(blob);
    } catch (e) {
      console.error("GIF generation failed:", e);
      toast.error("Gagal membuat GIF");
    } finally {
      setGenerating(false);
    }
  };

  const downloadGif = () => {
    if (!gifUrl) return;
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = `ZMI-Boomerang-${shortCode}.gif`;
    a.click();
    toast.success("Boomerang GIF didownload! 🎬");
  };

  if (photos.length < 2) return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🎬 Boomerang GIF
        </h3>
        {gifUrl && (
          <button onClick={() => { setGifUrl(null); }} className="text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!gifUrl ? (
        <div className="space-y-3">
          <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden bg-muted">
            {playing ? (
              <motion.img
                key={currentFrame}
                src={bounceSequence[currentFrame % bounceSequence.length]}
                className="w-full h-full object-cover"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              />
            ) : (
              <img src={photos[0]} className="w-full h-full object-cover" />
            )}
            {!playing && (
              <button onClick={startPreview} className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play className="w-8 h-8 text-white" />
              </button>
            )}
          </div>
          <button onClick={generateGif} disabled={generating}
            className="w-full bg-accent text-accent-foreground font-medium py-2 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
            {generating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Membuat GIF...</>) : (<><Play className="w-4 h-4" /> Buat Boomerang GIF</>)}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-40 h-40 mx-auto rounded-xl overflow-hidden">
            <img src={gifUrl} alt="Boomerang" className="w-full h-full object-cover" />
          </div>
          <button onClick={downloadGif}
            className="w-full bg-primary text-primary-foreground font-medium py-2 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Download GIF
          </button>
        </div>
      )}
    </div>
  );
};

export default BoomerangPreview;
