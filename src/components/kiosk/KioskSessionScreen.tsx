import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, VideoOff, Aperture } from "lucide-react";
import BeautyFilterControls, { getBeautyCSS, type BeautyFilter } from "@/components/kiosk/BeautyFilterControls";
import type { Template } from "@/hooks/useKioskState";
import type { CameraMode } from "@/services/cameraService";

interface Props {
  template: Template;
  photosTaken: number;
  countdown: number;
  captureMode: "auto" | "manual";
  capturedPhotos: string[];
  cameraMode: CameraMode;
  cameraName: string;
  cameraReady: boolean;
  cameraError: boolean;
  capturing: boolean;
  beautyFilter: BeautyFilter;
  onBeautyChange: (b: BeautyFilter) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStartCamera: () => void;
  onManualCapture: () => void;
  onRetake: () => void;
}

const KioskSessionScreen = ({
  template, photosTaken, countdown, captureMode, capturedPhotos,
  cameraMode, cameraName, cameraReady, cameraError, capturing,
  beautyFilter, onBeautyChange, videoRef,
  onStartCamera, onManualCapture, onRetake,
}: Props) => {
  // Auto-start camera when entering session
  useEffect(() => {
    if (!cameraReady && !cameraError && cameraMode !== "dslr") {
      onStartCamera();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      key="session"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 jebox-gray-bg flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full jebox-blue-bg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm sm:text-base tracking-wider">
            {countdown > 0 ? (
              <>{String(Math.floor(countdown / 60)).padStart(2, "0")}.{String(countdown % 60).padStart(2, "0")}</>
            ) : (
              <>{String(Math.min(photosTaken + 1, template.photos)).padStart(2, "0")}/{String(template.photos).padStart(2, "0")}</>
            )}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-light text-primary tracking-jebox text-center flex-1 mx-4">
          LET'S CAPTURE YOUR MOMENT
        </h2>
      </div>

      {/* Main content: frame preview + camera */}
      <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
        {/* Left: Frame preview with captured photos */}
        <div className="w-1/3 flex flex-col">
          <div className="browser-window flex-1 bg-card/30 flex flex-col">
            <div className="browser-titlebar">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-primary" />
                <span className="text-xs text-primary tracking-wider font-medium">PREVIEW</span>
              </div>
              <span className="text-primary text-sm">×</span>
            </div>
            <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
              {capturedPhotos.map((photo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-sm overflow-hidden border border-primary/20"
                >
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-auto object-cover" />
                </motion.div>
              ))}
              {Array.from({ length: Math.max(0, template.photos - capturedPhotos.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-[4/3] border-2 border-dashed border-primary/20 rounded-sm flex items-center justify-center">
                  <span className="text-primary/30 text-xs">{capturedPhotos.length + i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[2px] bg-primary self-stretch my-4" />

        {/* Right: Camera feed */}
        <div className="flex-1 flex flex-col relative">
          {/* Countdown overlay */}
          {countdown > 0 && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <span className="text-8xl sm:text-9xl font-bold text-primary-foreground drop-shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                {countdown}
              </span>
            </motion.div>
          )}

          {/* Camera area */}
          <div className="flex-1 rounded-lg overflow-hidden relative bg-muted">
            {cameraMode === "dslr" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {capturing ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-sm text-primary font-medium">Mengambil foto...</p>
                  </>
                ) : capturedPhotos.length > 0 ? (
                  <img src={capturedPhotos[capturedPhotos.length - 1]} alt="Last capture" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Aperture className="w-16 h-16 text-primary" />
                    <p className="text-sm text-muted-foreground">Mode DSLR Canon</p>
                    <p className="text-xs text-primary font-mono">{cameraName}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${cameraReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  style={{
                    ...(() => {
                      const hasBeauty = beautyFilter.smooth > 0 || beautyFilter.brighten > 0 || beautyFilter.slim > 0;
                      if (hasBeauty) {
                        const css = getBeautyCSS(beautyFilter);
                        return { filter: css.filter, transform: css.transform };
                      }
                      return { transform: "scaleX(-1)" };
                    })()
                  }}
                />

                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <VideoOff className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Kamera tidak tersedia</p>
                    <button onClick={onStartCamera} className="text-xs text-primary hover:underline">Coba lagi</button>
                  </div>
                ) : !cameraReady ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground tracking-wider">Memulai kamera...</p>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-sm text-primary tracking-wider">
              Foto {Math.min(photosTaken + 1, template.photos)} / {template.photos}
            </div>

            {capturedPhotos.length > 0 && photosTaken < template.photos && (
              <motion.button
                onClick={onRetake}
                whileTap={{ scale: 0.9 }}
                className="px-6 py-2.5 rounded-full bg-accent text-accent-foreground font-bold text-sm tracking-wider"
              >
                retake
              </motion.button>
            )}

            {captureMode === "manual" && cameraReady && photosTaken < template.photos && (
              <motion.button
                onClick={onManualCapture}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full border-4 border-primary bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary" />
              </motion.button>
            )}
          </div>

          {cameraMode !== "dslr" && cameraReady && (
            <div className="mt-2">
              <BeautyFilterControls beauty={beautyFilter} onChange={onBeautyChange} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KioskSessionScreen;
