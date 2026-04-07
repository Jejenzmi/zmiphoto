import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Music } from "lucide-react";
import {
  initAudio,
  startBackgroundMusic,
  stopBackgroundMusic,
  isBackgroundMusicPlaying,
  setBackgroundMusicVolume,
} from "@/services/audioService";

interface AudioControlsProps {
  compact?: boolean;
}

const AudioControls = ({ compact = false }: AudioControlsProps) => {
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const [volume, setVolume] = useState(30);

  const toggleMusic = () => {
    initAudio();
    if (musicOn) {
      stopBackgroundMusic();
      setMusicOn(false);
    } else {
      startBackgroundMusic();
      setBackgroundMusicVolume(volume / 1000);
      setMusicOn(true);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setBackgroundMusicVolume(val / 1000);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleMusic}
          className={`p-1.5 rounded-lg transition-all ${
            musicOn ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
          title={musicOn ? "Matikan musik" : "Nyalakan musik"}
        >
          <Music className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { initAudio(); setSfxOn(!sfxOn); }}
          className={`p-1.5 rounded-lg transition-all ${
            sfxOn ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
          title={sfxOn ? "Matikan SFX" : "Nyalakan SFX"}
        >
          {sfxOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5" /> Audio
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={toggleMusic}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              musicOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            🎵 Musik {musicOn ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => { initAudio(); setSfxOn(!sfxOn); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              sfxOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            🔊 SFX {sfxOn ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      {musicOn && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <VolumeX className="w-3 h-3 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(+e.target.value)}
            className="flex-1 h-1.5 accent-primary"
          />
          <Volume2 className="w-3 h-3 text-muted-foreground" />
        </motion.div>
      )}
    </div>
  );
};

export { AudioControls };
export const useSfxEnabled = () => {
  // Simple global flag - could be made into a context if needed
  return true;
};
