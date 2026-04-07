import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { MessageCircle, Mail, ArrowRight, RefreshCw, Download, Image, FileText, Film } from "lucide-react";
import type { Template } from "@/hooks/useKioskState";
import { generateDigitalReceipt } from "@/utils/receiptRenderer";
import { createBoomerangGif } from "@/utils/gifEncoder";
import { toast } from "sonner";

interface Props {
  shortCode: string;
  compositePreview: string | null;
  selectedTemplate: Template;
  selectedFilter: string;
  capturedPhotos: string[];
  onPhotoAgain: () => void;
}

const DONE_TIMER = 180;

const KioskDoneScreen = ({
  shortCode, compositePreview, selectedTemplate, selectedFilter,
  capturedPhotos, onPhotoAgain,
}: Props) => {
  const galleryUrl = `${window.location.origin}/gallery?code=${shortCode}`;
  const [timeLeft, setTimeLeft] = useState(DONE_TIMER);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [boomerangUrl, setBoomerangUrl] = useState<string | null>(null);
  const [generatingGif, setGeneratingGif] = useState(false);

  // Generate receipt preview
  useEffect(() => {
    if (!shortCode) return;
    generateDigitalReceipt({
      shortCode,
      templateName: selectedTemplate.name,
      filterApplied: selectedFilter,
      photoCount: capturedPhotos.length,
      price: selectedTemplate.price,
      date: new Date(),
      galleryUrl,
      capturedPhotos,
    }).then(setReceiptPreview).catch(console.error);
  }, [shortCode]);

  // Auto-generate boomerang if 2+ photos
  useEffect(() => {
    if (capturedPhotos.length < 2) return;
    setGeneratingGif(true);
    createBoomerangGif(capturedPhotos, 480, 480, 200)
      .then((blob) => {
        setBoomerangUrl(URL.createObjectURL(blob));
      })
      .catch(console.error)
      .finally(() => setGeneratingGif(false));
  }, [capturedPhotos]);

  useEffect(() => {
    if (timeLeft <= 0) { onPhotoAgain(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onPhotoAgain]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}.${String(s % 60).padStart(2, "0")}`;

  const downloadFile = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
    toast.success(`${filename} didownload! 📥`);
  };

  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 jebox-gray-bg flex flex-col"
    >
      {/* Top bar with timer */}
      <div className="flex items-center px-6 py-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full jebox-blue-bg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div className="flex gap-8 sm:gap-12 items-start max-w-5xl w-full">
          {/* Left: Text + share + downloads */}
          <div className="flex-1 space-y-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-light text-primary leading-relaxed tracking-wide">
                Thank you for the memories!
              </h2>
              <p className="text-lg sm:text-xl text-primary/70 mt-2 leading-relaxed tracking-wide">
                Here is your soft file. Don't forget to save and share your moment.
              </p>
            </div>

            {/* Download buttons */}
            <div className="space-y-2">
              <p className="text-primary/60 text-xs tracking-wider uppercase font-medium">Download:</p>
              <div className="flex flex-wrap gap-2">
                {/* Download Composite Photo */}
                {compositePreview && (
                  <button
                    onClick={() => downloadFile(compositePreview, `ZMI-Photo-${shortCode}.jpg`)}
                    className="flex items-center gap-2 border-2 border-primary/30 rounded-full py-2.5 px-5 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <Image className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                    <span className="text-primary/70 text-sm tracking-wider group-hover:text-primary">Foto</span>
                    <Download className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary" />
                  </button>
                )}

                {/* Download Receipt */}
                {receiptPreview && (
                  <button
                    onClick={() => downloadFile(receiptPreview, `ZMI-Receipt-${shortCode}.png`)}
                    className="flex items-center gap-2 border-2 border-primary/30 rounded-full py-2.5 px-5 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <FileText className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                    <span className="text-primary/70 text-sm tracking-wider group-hover:text-primary">Receipt</span>
                    <Download className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary" />
                  </button>
                )}

                {/* Download Boomerang */}
                {boomerangUrl && (
                  <button
                    onClick={() => downloadFile(boomerangUrl, `ZMI-Boomerang-${shortCode}.gif`)}
                    className="flex items-center gap-2 border-2 border-primary/30 rounded-full py-2.5 px-5 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <Film className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                    <span className="text-primary/70 text-sm tracking-wider group-hover:text-primary">Boomerang</span>
                    <Download className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary" />
                  </button>
                )}

                {generatingGif && (
                  <span className="text-primary/40 text-xs flex items-center gap-1 py-2.5 px-3">
                    <Film className="w-3.5 h-3.5 animate-pulse" /> Membuat boomerang...
                  </span>
                )}
              </div>
            </div>

            {/* Share options */}
            <div className="space-y-2">
              <p className="text-primary/60 text-xs tracking-wider uppercase font-medium">Share via:</p>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out my photo! ${galleryUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border-2 border-primary/30 rounded-full py-2.5 px-5 hover:border-green-500/60 transition-colors group"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-primary/60 text-sm tracking-wider group-hover:text-primary">WhatsApp</span>
                </a>
                <a
                  href={`mailto:?subject=My Photo&body=${encodeURIComponent(`Here's my photo: ${galleryUrl}`)}`}
                  className="flex items-center gap-2 border-2 border-primary/30 rounded-full py-2.5 px-5 hover:border-primary/60 transition-colors group"
                >
                  <Mail className="w-4 h-4 text-primary/60" />
                  <span className="text-primary/60 text-sm tracking-wider group-hover:text-primary">Email</span>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2 text-primary/50 text-sm tracking-wide">
              <span>Or simply scan the QR code to download.</span>
              <ArrowRight className="w-5 h-5" />
            </div>

            <motion.button
              onClick={onPhotoAgain}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 jebox-blue-bg text-primary-foreground font-medium py-3 px-8 rounded-full text-sm tracking-jebox hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              TAKE ANOTHER PHOTO
            </motion.button>
          </div>

          {/* Right: QR Code + Receipt Preview */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div
              className="border-[3px] border-primary p-6 sm:p-8 flex items-center justify-center bg-card"
              style={{ borderRadius: "4px 10px 6px 12px", minWidth: 200, minHeight: 200 }}
            >
              <QRCodeSVG value={galleryUrl} size={160} level="M" />
            </div>
            {shortCode && (
              <p className="text-center text-primary/60 text-xs tracking-widest font-mono">{shortCode}</p>
            )}

            {receiptPreview && (
              <div className="mt-2">
                <p className="text-primary/50 text-xs tracking-wider text-center mb-2">YOUR RECEIPT</p>
                <div className="border border-primary/20 rounded-lg overflow-hidden shadow-md" style={{ maxWidth: 180 }}>
                  <img src={receiptPreview} alt="Thermal receipt" className="w-full h-auto" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default KioskDoneScreen;
