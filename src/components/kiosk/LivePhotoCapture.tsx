import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Video, Download, Loader2, Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LivePhotoCaptureProps {
  shortCode: string;
}

const LivePhotoCapture = ({ shortCode }: LivePhotoCaptureProps) => {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadAndSave = async (blob: Blob) => {
    try {
      const filename = `${shortCode}/live-photo.webm`;
      const { data, error } = await supabase.storage.from("photo-captures").upload(filename, blob, {
        contentType: "video/webm",
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("photo-captures").getPublicUrl(data.path);
      await supabase.from("photo_sessions").update({ live_photo_url: urlData.publicUrl } as any).eq("short_code", shortCode);
    } catch (e) {
      console.error("Live photo upload failed:", e);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCountdown(3);
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(0);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        toast.success("Live Photo 3 detik selesai! 🎬");
        // Upload in background
        uploadAndSave(blob);
      };

      mediaRecorder.start();
      setRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setRecording(false);
        }
      }, 3000);
    } catch (e) {
      console.error("Live photo error:", e);
      toast.error("Kamera tidak tersedia untuk Live Photo");
    }
  }, [shortCode]);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `ZMI-LivePhoto-${shortCode}.webm`;
    a.click();
    toast.success("Live Photo didownload! 🎬");
  };

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        🎥 Live Photo 3 Detik
      </h3>

      {!videoUrl ? (
        <div className="space-y-3">
          <div className="relative w-40 h-40 mx-auto rounded-xl overflow-hidden bg-muted">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <motion.span key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-bold text-white">
                  {countdown}
                </motion.span>
              </div>
            )}
            {recording && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-[10px] text-white font-mono">REC</span>
              </div>
            )}
          </div>
          <button onClick={recording ? stopRecording : startRecording}
            className={`w-full font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
              recording ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground hover:opacity-90"
            }`}>
            {recording ? (<><Square className="w-4 h-4" /> Stop</>) : (<><Video className="w-4 h-4" /> Rekam Live Photo</>)}
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="w-40 h-40 mx-auto rounded-xl overflow-hidden">
            <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          </div>
          <div className="flex gap-2">
            <button onClick={downloadVideo}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={reset}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-muted text-muted-foreground py-2 rounded-lg hover:text-foreground">
              Rekam Ulang
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LivePhotoCapture;
