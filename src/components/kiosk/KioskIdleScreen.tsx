import { motion } from "framer-motion";
import { initAudio } from "@/services/audioService";

interface Props {
  onStart: () => void;
}

const KioskIdleScreen = ({ onStart }: Props) => {
  const handleStart = async () => {
    try {
      initAudio();
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
      const screenOrientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (screenOrientation?.lock) {
        await screenOrientation.lock("portrait-primary").catch(() => {});
      }
    } catch {
      // Ignore browser restrictions in preview and continue flow.
    } finally {
      onStart();
    }
  };

  return (
    <motion.button
      key="idle"
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 jebox-gray-bg flex flex-col cursor-pointer"
      onClick={handleStart}
      aria-label="Tap to start"
    >
      {/* Main content */}
      <div className="pointer-events-none flex-1 flex items-center justify-center relative">
        {/* Left vertical line */}
        <div className="absolute left-[25%] top-[15%] bottom-[25%] w-[2px] bg-primary" />
        {/* Right vertical line */}
        <div className="absolute right-[25%] top-[15%] bottom-[25%] w-[2px] bg-primary" />

        <div className="text-center">
          <h1 className="text-6xl sm:text-8xl font-light text-primary tracking-jebox leading-tight">
            TAP TO
          </h1>
          <h1 className="text-6xl sm:text-8xl font-light text-primary tracking-jebox leading-tight">
            START
          </h1>
        </div>
      </div>

      {/* Bottom blue bar */}
      <div className="pointer-events-none h-12 sm:h-16 jebox-blue-bg" />
    </motion.button>
  );
};

export default KioskIdleScreen;
