import { motion } from "framer-motion";
import CompositePreview from "@/components/kiosk/CompositePreview";
import type { Template } from "@/hooks/useKioskState";

interface Props {
  templates: Template[];
  selectedTemplate: Template;
  onSelectTemplate: (t: Template) => void;
  onBack: () => void;
  onNext: () => void;
}

const KioskFrameScreen = ({
  templates, selectedTemplate, onSelectTemplate,
  onBack, onNext,
}: Props) => (
  <motion.div
    key="frame"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-40 jebox-gray-bg flex flex-col"
  >
    {/* Top bar */}
    <div className="flex items-center justify-between px-6 py-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full jebox-blue-bg flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm tracking-wider">05.00</span>
      </div>
      <h2 className="text-2xl sm:text-4xl font-light text-primary tracking-jebox text-center flex-1 mx-4">
        SELECT YOUR FAVORITE FRAME
      </h2>
    </div>

    {/* Main: Preview + Frame chooser */}
    <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
      {/* Left: Frame Preview */}
      <div className="w-1/2 flex flex-col">
        <div className="browser-window flex-1 bg-card/30 flex flex-col">
          <div className="browser-titlebar">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
              <span className="text-xs text-primary tracking-wider font-medium">PREVIEW FRAME</span>
            </div>
            <span className="text-primary text-sm">×</span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
            {selectedTemplate.image ? (
              <img
                src={selectedTemplate.image}
                alt={selectedTemplate.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-primary/30 text-sm tracking-wider">No preview</div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-[2px] bg-primary self-stretch my-4" />

      {/* Right: Frame chooser */}
      <div className="w-1/2 flex flex-col min-h-0">
        <div className="browser-window flex-1 bg-card/30 flex flex-col min-h-0">
          <div className="browser-titlebar">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
              <span className="text-xs text-primary tracking-wider font-medium">CHOOSE YOUR FRAME</span>
            </div>
            <span className="text-primary text-sm">×</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t)}
                  className={`relative aspect-[3/4] border-2 rounded-sm overflow-hidden transition-all ${
                    selectedTemplate.id === t.id
                      ? "border-primary shadow-lg scale-[1.02]"
                      : "border-primary/20 hover:border-primary/50"
                  }`}
                  style={{ borderRadius: "2px 6px 4px 8px" }}
                >
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/30 text-xs">
                      {t.name}
                    </div>
                  )}
                  {selectedTemplate.id === t.id && (
                    <div className="absolute inset-0 border-4 border-primary rounded-sm" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <span className="text-white text-xs tracking-wider">{t.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between p-4 border-t-2 border-primary/20">
            <motion.button
              onClick={onBack}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-2.5 rounded-full jebox-blue-bg text-primary-foreground font-medium text-sm tracking-wider"
            >
              back
            </motion.button>
            <motion.button
              onClick={onNext}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-2.5 rounded-full bg-accent text-accent-foreground font-medium text-sm tracking-wider"
            >
              next
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default KioskFrameScreen;
