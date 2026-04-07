import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Download, Printer, Loader2 } from "lucide-react";
import { generateDigitalReceipt, formatThermalReceipt } from "@/utils/receiptRenderer";
import { printPhoto } from "@/services/printService";
import { toast } from "sonner";

interface PhotoReceiptProps {
  shortCode: string;
  templateName: string;
  filterApplied: string;
  photoCount: number;
  price: number;
  venueName?: string;
  galleryUrl: string;
}

const PhotoReceipt = ({ shortCode, templateName, filterApplied, photoCount, price, venueName, galleryUrl }: PhotoReceiptProps) => {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const img = await generateDigitalReceipt({
        shortCode,
        templateName,
        filterApplied,
        photoCount,
        price,
        venueName,
        date: new Date(),
        galleryUrl,
      });
      setReceiptImage(img);
      toast.success("Receipt siap! 🧾");
    } catch (e) {
      toast.error("Gagal membuat receipt");
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!receiptImage) return;
    const a = document.createElement("a");
    a.href = receiptImage;
    a.download = `ZMI-Receipt-${shortCode}.png`;
    a.click();
  };

  const thermalPrint = async () => {
    setPrinting(true);
    try {
      if (!receiptImage) await generate();
      const result = await printPhoto({
        imageBase64: receiptImage || "",
        copies: 1,
        paperSize: "receipt",
      });
      if (result.success) {
        toast.success("Receipt dicetak! 🖨️");
      } else {
        toast.error("Print gagal", { description: result.error });
      }
    } catch {
      toast.error("Print gagal");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        🧾 Photo Receipt
      </h3>

      {!receiptImage ? (
        <button
          onClick={generate}
          disabled={generating}
          className="w-full bg-muted text-foreground font-medium py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Membuat receipt...</>
          ) : (
            <><Receipt className="w-4 h-4" /> Buat Receipt</>
          )}
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="w-[160px] mx-auto rounded-lg overflow-hidden border border-border">
            <img src={receiptImage} alt="Receipt" className="w-full" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={download}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={thermalPrint}
              disabled={printing}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-accent text-accent-foreground py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Cetak Struk
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PhotoReceipt;
