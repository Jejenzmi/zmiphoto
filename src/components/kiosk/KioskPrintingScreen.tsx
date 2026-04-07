import { motion } from "framer-motion";
import { Loader2, Printer, CheckCircle } from "lucide-react";
import type { PrintStatus } from "@/services/printService";
import { PRINTER_DISPLAY } from "@/services/printService";
import type { ProductType } from "@/hooks/useKioskState";

interface Props {
  printProgress: number;
  printSuccess: boolean;
  uploading: boolean;
  printError: string | null;
  printerStatus: PrintStatus | null;
  productType: ProductType;
}

const KioskPrintingScreen = ({ printProgress, printSuccess, uploading, printError, printerStatus, productType }: Props) => {
  const targetPrinter = productType === "a3" ? PRINTER_DISPLAY.a3 : PRINTER_DISPLAY.photostrip;

  return (
    <motion.div
      key="printing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 jebox-blue-bg flex flex-col items-center justify-center"
    >
      <div className="text-center max-w-sm w-full px-6">
        <div className="mb-6">
          {printSuccess ? (
            <CheckCircle className="w-20 h-20 text-accent mx-auto" />
          ) : (
            <motion.div animate={{ rotate: uploading ? 0 : 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Printer className="w-20 h-20 text-primary-foreground/80 mx-auto" />
            </motion.div>
          )}
        </div>

        <h2 className="text-3xl font-light text-primary-foreground tracking-jebox mb-2">
          {printSuccess ? "DONE!" : uploading ? "UPLOADING..." : "PRINTING..."}
        </h2>

        <p className="text-sm text-primary-foreground/50 mb-2 tracking-wider">
          {printerStatus?.connected
            ? `Printer: ${targetPrinter}`
            : "Menyimpan ke cloud..."}
        </p>

        {printError && (
          <p className="text-xs text-accent mb-2">⚠️ {printError} — foto tetap disimpan</p>
        )}

        <p className="text-sm text-primary-foreground/40 mb-8 tracking-wider">Mohon tunggu sebentar</p>

        <div className="w-full bg-primary-foreground/10 rounded-full h-2 overflow-hidden mb-4">
          <motion.div
            className="h-full bg-accent rounded-full"
            animate={{ width: `${printProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm font-mono text-primary-foreground/60">{printProgress}%</span>
      </div>
    </motion.div>
  );
};

export default KioskPrintingScreen;
