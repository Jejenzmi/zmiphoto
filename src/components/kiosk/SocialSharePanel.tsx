import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Instagram, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface SocialSharePanelProps {
  shortCode: string;
  compositeUrl?: string | null;
  galleryUrl: string;
}

const SocialSharePanel = ({ shortCode, compositeUrl, galleryUrl }: SocialSharePanelProps) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "share">("qr");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      toast.success("Link disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const shareToWhatsApp = () => {
    const text = `Cek foto kita di ZMI Photobox! 📸✨\n${galleryUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ZMI Photobox",
          text: `Cek foto kita! 📸 Kode: ${shortCode}`,
          url: galleryUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyLink();
    }
  };

  const downloadPhoto = () => {
    if (!compositeUrl) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = `ZMI-Photobox-${shortCode}.jpg`;
    a.click();
    toast.success("Foto didownload! 📥");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mx-auto"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab("qr")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "qr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          📱 Scan QR
        </button>
        <button
          onClick={() => setActiveTab("share")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "share" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          🔗 Share
        </button>
      </div>

      {activeTab === "qr" && (
        <div className="text-center space-y-4">
          <div className="glass-card rounded-2xl p-6 inline-block glow-primary">
            <QRCodeSVG
              value={galleryUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              style={{ padding: 12, borderRadius: 12, background: "#ffffff" }}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-mono">Kode: {shortCode}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Scan untuk buka Gallery, Chat & Download
            </p>
          </div>
        </div>
      )}

      {activeTab === "share" && (
        <div className="space-y-3">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareToWhatsApp}
              className="glass-card rounded-xl p-3 flex flex-col items-center gap-2 hover:border-[#25D366]/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center group-hover:bg-[#25D366]/30 transition-colors">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <span className="text-xs font-medium text-foreground">WhatsApp</span>
            </button>

            <button
              onClick={shareNative}
              className="glass-card rounded-xl p-3 flex flex-col items-center gap-2 hover:border-accent/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <Share2 className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">Share</span>
            </button>
          </div>

          {/* Download */}
          {compositeUrl && (
            <button
              onClick={downloadPhoto}
              className="w-full glass-card rounded-xl p-3 flex items-center justify-center gap-2 hover:border-primary/50 transition-all"
            >
              <Download className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Download Foto</span>
            </button>
          )}

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full glass-card rounded-xl p-3 flex items-center justify-center gap-2 hover:border-muted-foreground/30 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Link Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Salin Link</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-muted-foreground">
            💬 Buka gallery untuk chat, kirim gift, & download HD
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default SocialSharePanel;
