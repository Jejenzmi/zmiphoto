import { useState } from "react";
import { motion } from "framer-motion";
import { Type, X } from "lucide-react";

interface CustomTextInputProps {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
}

const TEXT_PRESETS = [
  "Happy Birthday! 🎂",
  "Best Friends Forever 💕",
  "Class of 2026 🎓",
  "Girls Night Out ✨",
  "Squad Goals 💯",
  "Love You! ❤️",
  "Besties 🫶",
  "YOLO 🔥",
];

const CustomTextInput = ({ value, onChange, maxLength = 30 }: CustomTextInputProps) => {
  const [showInput, setShowInput] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowInput(!showInput)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        <Type className="w-3.5 h-3.5" />
        {value ? "Edit Teks" : "Tambah Teks"}
      </button>

      {showInput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 glass-card rounded-xl p-3 space-y-2"
        >
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
              placeholder="Tulis teks custom..."
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-8"
            />
            {value && (
              <button
                onClick={() => onChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground text-right">
            {value.length}/{maxLength}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => onChange(preset)}
                className="px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-all"
              >
                {preset}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CustomTextInput;
