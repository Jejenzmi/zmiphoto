import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";

import { useKioskState, type Template } from "@/hooks/useKioskState";
import { useKioskCamera } from "@/hooks/useKioskCamera";
import { useOfflineMode } from "@/hooks/useOfflineMode";

import KioskIdleScreen from "@/components/kiosk/KioskIdleScreen";
import KioskInstructionsScreen from "@/components/kiosk/KioskInstructionsScreen";
import KioskSelectionScreen from "@/components/kiosk/KioskSelectionScreen";
import KioskPaymentScreen from "@/components/kiosk/KioskPaymentScreen";
import KioskSessionScreen from "@/components/kiosk/KioskSessionScreen";
import KioskFrameScreen from "@/components/kiosk/KioskFrameScreen";
import KioskCompositingScreen from "@/components/kiosk/KioskCompositingScreen";

import KioskPrintingScreen from "@/components/kiosk/KioskPrintingScreen";
import KioskDoneScreen from "@/components/kiosk/KioskDoneScreen";
import OfflineIndicator from "@/components/OfflineIndicator";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playCountdownBeep, playShutterClick, playSuccessChime } from "@/services/audioService";
import { checkPrintBridge, printPhoto, printThermal, PRINTER_MAP, type PrintStatus } from "@/services/printService";
import { drawCompositeWithFrame } from "@/utils/frameRenderer";
import { generateDigitalReceipt } from "@/utils/receiptRenderer";

const DEFAULT_TEMPLATE: Template = {
  id: "default",
  name: "Loading...",
  photos: 3,
  desc: "",
  image: "",
  price: 10000,
  orientation: "portrait",
  canvasWidth: 600,
  canvasHeight: 1800,
  gridCols: 1,
  slotConfig: null,
};

const generateShortCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "JBX";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const KioskPage = () => {
  const { kioskCode: paramCode } = useParams();
  const [searchParams] = useSearchParams();
  const urlKioskCode = paramCode || searchParams.get("code") || "";

  const [kioskData, setKioskData] = useState<any>(null);
  const [kioskLoading, setKioskLoading] = useState(!!urlKioskCode);
  const activeKioskCode = kioskData?.kiosk_code || urlKioskCode || "KIOSK-DEMO";
  const activeKioskId = kioskData?.id || null;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const kiosk = useKioskState(DEFAULT_TEMPLATE);
  const camera = useKioskCamera(kiosk.state, kiosk.selectedTemplate.orientation);
  const offline = useOfflineMode();

  const [printerStatus, setPrinterStatus] = useState<PrintStatus | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState(false);

  const selectedFrameOverlayUrl = templates.find((template) => template.id === kiosk.selectedTemplate.id)?.image ?? kiosk.selectedTemplate.image ?? null;

  // Load templates from DB
  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      const { data } = await supabase
        .from("templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data && data.length > 0) {
        const dbTemplates: Template[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          photos: t.num_photos || 3,
          desc: t.description || `${t.num_photos || 3} foto ${t.grid_type}`,
          image: t.asset_url || "",
          price: t.price || 10000,
          orientation: (t.orientation || "portrait") as "portrait" | "landscape",
          canvasWidth: t.canvas_width || 600,
          canvasHeight: t.canvas_height || 1800,
          gridCols: t.grid_cols || 1,
          slotConfig: t.slot_config || null,
        }));
        setTemplates(dbTemplates);
        kiosk.setSelectedTemplate(dbTemplates[0]);
      }
      setTemplatesLoading(false);
    };
    loadTemplates();
  }, []);

  // Load kiosk data from DB
  useEffect(() => {
    if (!urlKioskCode) { setKioskLoading(false); return; }
    const loadKiosk = async () => {
      const { data } = await supabase.from("kiosks").select("*").eq("kiosk_code", urlKioskCode).maybeSingle();
      if (data) setKioskData(data);
      else toast.error("Kiosk tidak ditemukan", { description: `Kode: ${urlKioskCode}` });
      setKioskLoading(false);
    };
    loadKiosk();
  }, [urlKioskCode]);

  // Heartbeat
  useEffect(() => {
    if (!activeKioskId) return;
    const ping = () => supabase.from("kiosks").update({ last_ping: new Date().toISOString(), status: "online" }).eq("id", activeKioskId).then(() => {});
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [activeKioskId]);

  // Prevent context menu; fullscreen is requested from explicit user taps on kiosk screens.
  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", preventContext);
    return () => {
      document.removeEventListener("contextmenu", preventContext);
    };
  }, []);

  // Countdown logic
  useEffect(() => {
    if (kiosk.state !== "SESSION" || kiosk.countdown <= 0) return;
    if (kiosk.countdown <= 3) playCountdownBeep(kiosk.countdown === 1 ? "high" : "normal");
    const timer = setTimeout(() => kiosk.setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [kiosk.state, kiosk.countdown]);


  // Auto-capture on countdown=0
  useEffect(() => {
    if (kiosk.state === "SESSION" && kiosk.countdown === 0 && kiosk.captureMode === "auto" && kiosk.photosTaken < kiosk.selectedTemplate.photos && camera.cameraReady) {
      kiosk.setFlashActive(true);
      playShutterClick();
      setTimeout(() => kiosk.setFlashActive(false), 300);

      const doCapture = async () => {
        const photo = await camera.capturePhoto(kiosk.beautyFilter);
        if (photo) kiosk.setCapturedPhotos((prev) => [...prev, photo]);
        const next = kiosk.photosTaken + 1;
        kiosk.setPhotosTaken(next);
        if (next < kiosk.selectedTemplate.photos) {
          kiosk.setCountdown(kiosk.countdownDuration);
        } else {
          if (camera.cameraMode !== "dslr") camera.stopCamera();
          kiosk.setState("COMPOSITING");
        }
      };
      const timer = setTimeout(doCapture, 300);
      return () => clearTimeout(timer);
    }
  }, [kiosk.state, kiosk.countdown, kiosk.photosTaken, kiosk.selectedTemplate.photos, camera.cameraReady, camera.cameraMode, kiosk.captureMode, kiosk.countdownDuration]);

  const handleManualCapture = async () => {
    if (kiosk.captureMode !== "manual" || kiosk.photosTaken >= kiosk.selectedTemplate.photos || !camera.cameraReady) return;
    kiosk.setFlashActive(true);
    playShutterClick();
    setTimeout(() => kiosk.setFlashActive(false), 300);
    const photo = await camera.capturePhoto(kiosk.beautyFilter);
    if (photo) kiosk.setCapturedPhotos((prev) => [...prev, photo]);
    const next = kiosk.photosTaken + 1;
    kiosk.setPhotosTaken(next);
    if (next >= kiosk.selectedTemplate.photos) {
      if (camera.cameraMode !== "dslr") camera.stopCamera();
      kiosk.setState("COMPOSITING");
    }
  };

  const handleRetakeLastPhoto = () => {
    if (kiosk.capturedPhotos.length === 0) return;
    kiosk.setCapturedPhotos((prev) => prev.slice(0, -1));
    kiosk.setPhotosTaken((prev) => Math.max(0, prev - 1));
    if (kiosk.captureMode === "auto") kiosk.setCountdown(kiosk.countdownDuration);
    toast.info("Foto terakhir dihapus, ambil ulang!");
  };

  // Photo order init
  useEffect(() => {
    if (kiosk.state === "COMPOSITING" && kiosk.capturedPhotos.length > 0 && kiosk.photoOrder.length !== kiosk.capturedPhotos.length) {
      kiosk.setPhotoOrder(kiosk.capturedPhotos.map((_, i) => i));
    }
  }, [kiosk.state, kiosk.capturedPhotos.length]);

  // Upload helper
  const uploadPhoto = async (base64: string, filename: string): Promise<string | null> => {
    try {
      const res = await fetch(base64);
      const blob = await res.blob();
      const { data, error } = await supabase.storage.from("photo-captures").upload(filename, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("photo-captures").getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (e) {
      console.error("Upload failed:", e);
      return null;
    }
  };

  const createAndUploadComposite = async (code: string): Promise<string | null> => {
    if (kiosk.capturedPhotos.length === 0) return null;
    const canvas = document.createElement("canvas");
    const orderedPhotos = kiosk.photoOrder.length === kiosk.capturedPhotos.length
      ? kiosk.photoOrder.map((i) => kiosk.capturedPhotos[i])
      : kiosk.capturedPhotos;
    await drawCompositeWithFrame(canvas, orderedPhotos, {
      canvasWidth: kiosk.selectedTemplate.canvasWidth,
      canvasHeight: kiosk.selectedTemplate.canvasHeight,
      gridCols: kiosk.selectedTemplate.gridCols,
      totalSlots: kiosk.selectedTemplate.photos,
      colors: kiosk.frameColor.colors,
      customText: kiosk.customText || undefined,
      slotConfig: kiosk.selectedTemplate.slotConfig || undefined,
      stickers: kiosk.stickers.map(s => ({ emoji: s.emoji, x: s.x, y: s.y, scale: s.scale, rotation: s.rotation })),
    }, kiosk.selectedFilter, selectedFrameOverlayUrl);
    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    return await uploadPhoto(base64, `${code}/composite.jpg`);
  };

  // Print + save flow
  useEffect(() => {
    if (kiosk.state !== "PRINTING") return;
    const doPrintAndSave = async () => {
      kiosk.setPrintProgress(10);
      setPrintError(null);
      setPrintSuccess(false);
      kiosk.setPrintProgress(20);
      const status = await checkPrintBridge();
      setPrinterStatus(status);

      if (status.connected && kiosk.capturedPhotos.length > 0) {
        kiosk.setPrintProgress(40);
        const canvas = document.createElement("canvas");
        const orderedPrint = kiosk.photoOrder.length === kiosk.capturedPhotos.length ? kiosk.photoOrder.map((i) => kiosk.capturedPhotos[i]) : kiosk.capturedPhotos;
        await drawCompositeWithFrame(canvas, orderedPrint, {
          canvasWidth: kiosk.selectedTemplate.canvasWidth,
          canvasHeight: kiosk.selectedTemplate.canvasHeight,
          gridCols: kiosk.selectedTemplate.gridCols,
          totalSlots: kiosk.selectedTemplate.photos,
          colors: kiosk.frameColor.colors,
          customText: kiosk.customText || undefined,
          stickers: kiosk.stickers.map(s => ({ emoji: s.emoji, x: s.x, y: s.y, scale: s.scale, rotation: s.rotation })),
        }, kiosk.selectedFilter, selectedFrameOverlayUrl);
        const compositeBase64 = canvas.toDataURL("image/jpeg", 0.95);
        kiosk.setPrintProgress(60);
        // Route to correct printer based on product type
        const targetPrinter = kiosk.productType === "a3" ? PRINTER_MAP.a3 : PRINTER_MAP.photostrip;
        const paperSize = kiosk.productType === "a3"
          ? ("A3" as const)
          : ("2x6" as const);
        const result = await printPhoto({
          imageBase64: compositeBase64,
          printerName: targetPrinter,
          copies: 1,
          paperSize,
        });
        if (result.success) { setPrintSuccess(true); toast.success("🖨️ Foto berhasil dicetak!"); }
        else { setPrintError(result.error || "Print gagal"); toast.error("Print gagal", { description: result.error }); }

        // Print thermal receipt via iWare X Series
        kiosk.setPrintProgress(75);
        try {
          const receiptBase64 = await generateDigitalReceipt({
            shortCode: generateShortCode(),
            templateName: kiosk.selectedTemplate.name,
            filterApplied: kiosk.selectedFilter,
            photoCount: kiosk.capturedPhotos.length,
            price: kiosk.selectedTemplate.price,
            date: new Date(),
            galleryUrl: `${window.location.origin}/gallery`,
            capturedPhotos: kiosk.capturedPhotos,
          });
          const receiptResult = await printThermal(receiptBase64);
          if (receiptResult.success) {
            toast.success("🧾 Receipt berhasil dicetak!");
          } else {
            console.warn("Receipt print failed:", receiptResult.error);
          }
        } catch (e) {
          console.warn("Receipt print error:", e);
        }
      } else {
        kiosk.setPrintProgress(40);
      }

      kiosk.setPrintProgress(70);
      const code = generateShortCode();
      kiosk.setShortCode(code);
      kiosk.setUploading(true);

      if (!offline.isOnline) {
        offline.savePendingUpload({
          id: code, photos: kiosk.capturedPhotos, shortCode: code,
          filter: kiosk.selectedFilter, templateId: kiosk.selectedTemplate.id, timestamp: Date.now(),
        });
        toast.info("📡 Offline — foto disimpan lokal");
      } else {
        try {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < kiosk.capturedPhotos.length; i++) {
            const url = await uploadPhoto(kiosk.capturedPhotos[i], `${code}/photo-${i + 1}.jpg`);
            if (url) uploadedUrls.push(url);
          }
          const compositeUrl = await createAndUploadComposite(code);
          if (compositeUrl) kiosk.setCompositePreview(compositeUrl);

          // Generate & upload photo receipt (photostrip with actual photos)
          let receiptUrl: string | null = null;
          try {
            const receiptBase64 = await generateDigitalReceipt({
              shortCode: code,
              templateName: kiosk.selectedTemplate.name,
              filterApplied: kiosk.selectedFilter,
              photoCount: kiosk.capturedPhotos.length,
              price: kiosk.selectedTemplate.price,
              date: new Date(),
              galleryUrl: `${window.location.origin}/gallery?code=${code}`,
              capturedPhotos: kiosk.capturedPhotos,
            });
            receiptUrl = await uploadPhoto(receiptBase64, `${code}/receipt.png`);
          } catch (e) {
            console.warn("Receipt upload failed:", e);
          }

          // Generate & upload boomerang GIF
          let boomerangUrl: string | null = null;
          if (kiosk.capturedPhotos.length >= 2) {
            try {
              const { createBoomerangGif } = await import("@/utils/gifEncoder");
              const blob = await createBoomerangGif(kiosk.capturedPhotos, 480, 480, 200);
              const filename = `${code}/boomerang.gif`;
              const { data: upData, error: upErr } = await supabase.storage.from("photo-captures").upload(filename, blob, { contentType: "image/gif", upsert: true });
              if (!upErr && upData) {
                const { data: urlData } = supabase.storage.from("photo-captures").getPublicUrl(upData.path);
                boomerangUrl = urlData.publicUrl;
              }
            } catch (e) {
              console.warn("Boomerang upload failed:", e);
            }
          }

          await supabase.from("photo_sessions").insert({
            short_code: code,
            transaction_id: kiosk.transactionId,
            template_id: kiosk.selectedTemplate.id,
            venue_id: kioskData?.venue_id || null,
            filter_applied: kiosk.selectedFilter,
            raw_image_urls: uploadedUrls,
            final_image_url: compositeUrl || null,
            gif_url: receiptUrl,
            boomerang_url: boomerangUrl,
          });
        } catch (e) {
          console.error("Failed to save session:", e);
          offline.savePendingUpload({
            id: code, photos: kiosk.capturedPhotos, shortCode: code,
            filter: kiosk.selectedFilter, templateId: kiosk.selectedTemplate.id, timestamp: Date.now(),
          });
        }
      }

      kiosk.setUploading(false);
      kiosk.setPrintProgress(100);
      playSuccessChime();
      kiosk.setState("DONE");
    };
    doPrintAndSave();
  }, [kiosk.state]);

  // Auto-reset timer on DONE
  useEffect(() => {
    if (kiosk.state === "DONE") {
      const t = setTimeout(() => { kiosk.reset(); camera.setCameraReady(false); }, 180000);
      return () => clearTimeout(t);
    }
  }, [kiosk.state, kiosk.reset]);

  const startSession = () => {
    kiosk.setPhotosTaken(0);
    kiosk.setCapturedPhotos([]);
    kiosk.setCompositePreview(null);
    if (kiosk.captureMode === "auto") kiosk.setCountdown(kiosk.countdownDuration);
    kiosk.setState("SESSION");
  };

  const simulatePayment = async () => {
    try {
      const kioskId = activeKioskId;
      let fallbackId: string | null = null;
      if (!kioskId) {
        const { data: kiosks } = await supabase.from("kiosks").select("id").limit(1);
        fallbackId = kiosks?.[0]?.id || null;
      }
      const { data: txn } = await supabase.from("transactions").insert({
        kiosk_id: kioskId || fallbackId,
        amount: kiosk.selectedTemplate.price,
        payment_status: "paid",
        payment_method: "qris",
      }).select("id").single();
      if (txn) kiosk.setTransactionId(txn.id);
    } catch (e) {
      console.error("Failed to save transaction:", e);
    }
    setTimeout(() => kiosk.setState("FRAME"), 1500);
  };


  const handleReset = () => {
    kiosk.reset();
    camera.setCameraReady(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] jebox-gray-bg flex flex-col overflow-hidden relative">
      <OfflineIndicator pendingCount={offline.pendingCount} />

      {/* Reset button (floating) */}
      <button
        onClick={handleReset}
        className="fixed top-4 right-4 z-[60] w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
      >
        <RotateCcw className="w-4 h-4 text-primary/50" />
      </button>

      {/* Flash overlay */}
      <AnimatePresence>
        {kiosk.flashActive && (
          <motion.div key="flash" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} className="fixed inset-0 bg-white z-[70] pointer-events-none" />
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {kiosk.state === "IDLE" && (
          <KioskIdleScreen onStart={() => kiosk.setState("INSTRUCTIONS")} />
        )}

        {kiosk.state === "INSTRUCTIONS" && (
          <KioskInstructionsScreen onContinue={() => kiosk.setState("SELECTION")} />
        )}

        {kiosk.state === "SELECTION" && templatesLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 jebox-gray-bg flex items-center justify-center">
            <p className="text-primary tracking-jebox">LOADING...</p>
          </motion.div>
        )}

        {kiosk.state === "SELECTION" && !templatesLoading && templates.length === 0 && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 jebox-gray-bg flex items-center justify-center flex-col gap-4">
            <p className="text-primary font-semibold text-lg tracking-jebox">NO TEMPLATES</p>
            <p className="text-primary/50 text-sm">Admin perlu menambahkan template terlebih dahulu.</p>
          </motion.div>
        )}

        {kiosk.state === "SELECTION" && !templatesLoading && templates.length > 0 && (
          <KioskSelectionScreen
            templates={templates}
            selectedTemplate={kiosk.selectedTemplate}
            onSelectTemplate={kiosk.setSelectedTemplate}
            captureMode={kiosk.captureMode}
            setCaptureMode={kiosk.setCaptureMode}
            countdownDuration={kiosk.countdownDuration}
            setCountdownDuration={kiosk.setCountdownDuration}
            productType={kiosk.productType}
            setProductType={kiosk.setProductType}
            onStart={() => kiosk.setState("FRAME")}
          />
        )}

        {kiosk.state === "FRAME" && !templatesLoading && templates.length > 0 && (
          <KioskFrameScreen
            templates={templates}
            selectedTemplate={kiosk.selectedTemplate}
            onSelectTemplate={kiosk.setSelectedTemplate}
            onBack={() => kiosk.setState("SELECTION")}
            onNext={() => startSession()}
          />
        )}

        {kiosk.state === "PAYMENT" && (
          <KioskPaymentScreen
            template={kiosk.selectedTemplate}
            kioskId={activeKioskId}
            allowedMethods={kioskData?.allowed_payment_methods as string[] | undefined}
            onPaymentSuccess={(txnId) => {
              kiosk.setTransactionId(txnId);
              kiosk.setState("FRAME");
            }}
            onSimulatePayment={simulatePayment}
            onBack={() => kiosk.setState("SELECTION")}
          />
        )}

        {kiosk.state === "SESSION" && (
          <KioskSessionScreen
            template={kiosk.selectedTemplate}
            photosTaken={kiosk.photosTaken}
            countdown={kiosk.countdown}
            captureMode={kiosk.captureMode}
            capturedPhotos={kiosk.capturedPhotos}
            cameraMode={camera.cameraMode}
            cameraName={camera.cameraName}
            cameraReady={camera.cameraReady}
            cameraError={camera.cameraError}
            capturing={camera.capturing}
            beautyFilter={kiosk.beautyFilter}
            onBeautyChange={kiosk.setBeautyFilter}
            videoRef={camera.videoRef}
            onStartCamera={camera.startCamera}
            onManualCapture={handleManualCapture}
            onRetake={handleRetakeLastPhoto}
          />
        )}

        {kiosk.state === "COMPOSITING" && (
          <KioskCompositingScreen
            capturedPhotos={kiosk.capturedPhotos}
            template={kiosk.selectedTemplate}
            frameOverlayUrl={selectedFrameOverlayUrl}
            selectedFilter={kiosk.selectedFilter}
            setSelectedFilter={kiosk.setSelectedFilter}
            frameColor={kiosk.frameColor}
            setFrameColor={kiosk.setFrameColor}
            customText={kiosk.customText}
            setCustomText={kiosk.setCustomText}
            stickers={kiosk.stickers}
            setStickers={kiosk.setStickers}
            selected3DTheme={kiosk.selected3DTheme}
            setSelected3DTheme={kiosk.setSelected3DTheme}
            onOrderChange={kiosk.setPhotoOrder}
            onCapture3D={(url) => kiosk.setCaptured3DUrl(url)}
            onPrint={() => { kiosk.setPrintProgress(0); kiosk.setState("PRINTING"); }}
          />
        )}

        {kiosk.state === "PRINTING" && (
          <KioskPrintingScreen
            printProgress={kiosk.printProgress}
            printSuccess={printSuccess}
            uploading={kiosk.uploading}
            printError={printError}
            printerStatus={printerStatus}
            productType={kiosk.productType}
          />
        )}

        {kiosk.state === "DONE" && (
          <KioskDoneScreen
            shortCode={kiosk.shortCode}
            compositePreview={kiosk.compositePreview}
            selectedTemplate={kiosk.selectedTemplate}
            selectedFilter={kiosk.selectedFilter}
            capturedPhotos={kiosk.capturedPhotos}
            onPhotoAgain={() => kiosk.setState("SELECTION")}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KioskPage;
