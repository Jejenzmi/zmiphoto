import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { Template, ProductType } from "@/hooks/useKioskState";
import { Printer } from "lucide-react";

interface Props {
  templates: Template[];
  selectedTemplate: Template;
  onSelectTemplate: (t: Template) => void;
  captureMode: "auto" | "manual";
  setCaptureMode: (m: "auto" | "manual") => void;
  countdownDuration: number;
  setCountdownDuration: (d: number) => void;
  productType: ProductType;
  setProductType: (p: ProductType) => void;
  onStart: () => void;
}

const PRODUCT_OPTIONS: { value: ProductType; label: string; desc: string; printer: string }[] = [
  { value: "photostrip", label: "PHOTOSTRIP 2R", desc: "2R strip photo", printer: "DNP DS-RX1HS" },
  { value: "a3", label: "A3 / A4 POSTER", desc: "Large format print", printer: "Epson L18050" },
];

const A3_WIDTH_THRESHOLD = 2000;

const filterTemplatesByProduct = (templates: Template[], productType: ProductType): Template[] => {
  return templates.filter((t) =>
    productType === "a3" ? t.canvasWidth >= A3_WIDTH_THRESHOLD : t.canvasWidth < A3_WIDTH_THRESHOLD
  );
};

const KioskSelectionScreen = ({
  templates, selectedTemplate, onSelectTemplate,
  captureMode, setCaptureMode,
  countdownDuration, setCountdownDuration,
  productType, setProductType,
  onStart,
}: Props) => {
  const filteredTemplates = useMemo(() => filterTemplatesByProduct(templates, productType), [templates, productType]);

  // Auto-select first filtered template when product type changes
  useEffect(() => {
    if (filteredTemplates.length > 0 && !filteredTemplates.find(t => t.id === selectedTemplate.id)) {
      onSelectTemplate(filteredTemplates[0]);
    }
  }, [filteredTemplates, selectedTemplate.id, onSelectTemplate]);

  const padNum = (n: number) => String(n + 1).padStart(2, "0");

  return (
    <motion.div
      key="selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 jebox-gray-bg flex flex-col"
    >
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="min-h-full flex flex-col items-center px-6 py-6">
          <h1 className="text-4xl sm:text-5xl font-light text-primary tracking-jebox mb-6 text-center">
            CHOOSE YOUR PACKAGE
          </h1>

          {/* Product type selector */}
          <div className="flex gap-4 mb-6 max-w-md w-full">
            {PRODUCT_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => setProductType(opt.value)}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  productType === opt.value
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-primary/30 hover:border-primary/60"
                }`}
              >
                <Printer className={`w-6 h-6 ${productType === opt.value ? "text-primary" : "text-primary/40"}`} />
                <span className={`text-sm font-bold tracking-wider ${productType === opt.value ? "text-primary" : "text-primary/60"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground tracking-wider">{opt.printer}</span>
              </motion.button>
            ))}
          </div>

          {/* Package grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl w-full mb-6">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-primary/50">
                <p className="text-lg font-medium tracking-jebox">Tidak ada template untuk tipe ini</p>
              </div>
            ) : filteredTemplates.map((t, i) => {
              const isSelected = selectedTemplate.id === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => onSelectTemplate(t)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex flex-col items-center text-center group transition-all ${
                    isSelected ? "scale-105" : ""
                  }`}
                >
                  <div className="text-4xl sm:text-5xl font-bold text-primary font-script mb-3">
                    {padNum(i)}
                  </div>
                  <div
                    className={`w-full aspect-square border-2 rounded-sm transition-all relative overflow-hidden ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-primary/40 bg-transparent group-hover:border-primary"
                    }`}
                    style={{ borderRadius: "2px 6px 4px 8px" }}
                  >
                    {t.image && (
                      <img src={t.image} alt={t.name}
                        className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] object-cover rounded-sm" />
                    )}
                    {isSelected && <div className="absolute inset-0 border-4 border-primary rounded-sm" />}
                  </div>
                  <div className="mt-3 text-sm sm:text-base font-medium text-primary tracking-jebox uppercase">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Rp {t.price.toLocaleString("id-ID")}</div>
                </motion.button>
              );
            })
            }
          </div>

          {/* Capture settings */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-2">
              <button onClick={() => setCaptureMode("auto")}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wider transition-all ${
                  captureMode === "auto" ? "jebox-blue-bg text-primary-foreground" : "border-2 border-primary/40 text-primary hover:border-primary"
                }`}>TIMER</button>
              <button onClick={() => setCaptureMode("manual")}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wider transition-all ${
                  captureMode === "manual" ? "jebox-blue-bg text-primary-foreground" : "border-2 border-primary/40 text-primary hover:border-primary"
                }`}>MANUAL</button>
            </div>
            {captureMode === "auto" && (
              <div className="flex gap-1.5">
                {[3, 5, 10].map((sec) => (
                  <button key={sec} onClick={() => setCountdownDuration(sec)}
                    className={`w-10 h-8 rounded-full text-xs font-mono font-bold transition-all ${
                      countdownDuration === sec ? "jebox-blue-bg text-primary-foreground" : "border-2 border-primary/40 text-primary"
                    }`}>{sec}s</button>
                ))}
              </div>
            )}
          </div>

          {/* Start button */}
          <motion.button onClick={onStart} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="jebox-blue-bg text-primary-foreground font-medium py-4 px-16 rounded-full text-lg tracking-jebox hover:opacity-90 transition-opacity">
            NEXT →
          </motion.button>
        </div>
      </div>

      {/* Bottom marquee */}
      <div className="h-10 sm:h-12 jebox-blue-bg flex items-center overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="text-primary-foreground/60 text-sm font-script mx-4">jebox</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default KioskSelectionScreen;
