import { useState, useRef, useEffect, useCallback } from "react";
import { autoDetectCamera, getMediaConstraints, captureDSLR, type CameraMode, type CameraStatus } from "@/services/cameraService";
import { applyBeautyToCanvas, type BeautyFilter } from "@/components/kiosk/BeautyFilterControls";
import { toast } from "sonner";
import type { KioskState, Orientation } from "./useKioskState";

export function useKioskCamera(state: KioskState, selectedOrientation: Orientation) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStatusRef = useRef<CameraStatus | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("detecting");
  const [cameraName, setCameraName] = useState("");
  const [capturing, setCapturing] = useState(false);

  // Auto-detect camera on mount
  useEffect(() => {
    const detect = async () => {
      const status = await autoDetectCamera();
      cameraStatusRef.current = status;
      setCameraMode(status.mode);
      setCameraName(status.cameraName || "");
      if (status.mode === "dslr") {
        toast.success(`📷 ${status.cameraName} terdeteksi!`, { description: "Mode DSLR aktif" });
      } else if (status.mode === "external-webcam") {
        toast.success(`📹 ${status.cameraName} terdeteksi!`, { description: "Kamera eksternal aktif" });
      } else if (status.connected) {
        toast.info(`Menggunakan ${status.cameraName || "webcam internal"}`);
      } else {
        toast.warning("Kamera tidak terdeteksi", { description: status.message });
      }
    };
    detect();
  }, []);

  const getOrientedConstraints = useCallback((status: CameraStatus | null): MediaStreamConstraints => {
    const isLandscape = selectedOrientation === "landscape";
    const video: MediaTrackConstraints = {
      width: { ideal: isLandscape ? 1280 : 960 },
      height: { ideal: isLandscape ? 720 : 1280 },
    };
    if (status?.deviceId) {
      video.deviceId = { exact: status.deviceId };
    } else {
      video.facingMode = "user";
    }
    return { video, audio: false };
  }, [selectedOrientation]);

  const startingRef = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraMode === "dslr") {
      setCameraReady(true);
      return;
    }

    if (startingRef.current) return;
    startingRef.current = true;

    try {
      setCameraError(false);
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const constraints = getOrientedConstraints(cameraStatusRef.current);
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Camera timeout")), 10000)
      );
      const stream = await Promise.race([streamPromise, timeoutPromise]);

      streamRef.current = stream;
      const video = videoRef.current;

      if (!video) {
        throw new Error("Video element belum siap");
      }

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setCameraReady(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      stopCamera();
      setCameraError(true);
      const isSecure = window.isSecureContext;
      const desc = !isSecure
        ? "Kamera membutuhkan HTTPS atau localhost"
        : err?.message === "Camera timeout"
          ? "Kamera tidak merespon dalam 10 detik"
          : err?.message === "Video element belum siap"
            ? "Tampilan kamera belum siap, silakan coba lagi"
            : "Pastikan izin kamera diaktifkan";
      toast.error("Kamera tidak tersedia", { description: desc });
    } finally {
      startingRef.current = false;
    }
  }, [cameraMode, getOrientedConstraints, stopCamera]);


  // Start/stop camera based on state — only react to state changes
  useEffect(() => {
    if (state === "SESSION") {
      startCamera();
    } else if (cameraMode !== "dslr") {
      stopCamera();
    }
    return () => { if (cameraMode !== "dslr") stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const captureFromWebcam = useCallback((beautyFilter: BeautyFilter): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const hasBeauty = beautyFilter.smooth > 0 || beautyFilter.brighten > 0 || beautyFilter.slim > 0;
    if (hasBeauty) {
      applyBeautyToCanvas(ctx, video, beautyFilter);
    } else {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  const capturePhoto = useCallback(async (beautyFilter: BeautyFilter): Promise<string | null> => {
    if (cameraMode === "dslr") {
      setCapturing(true);
      const result = await captureDSLR();
      setCapturing(false);
      if (result.success) return result.photo;
      toast.error("DSLR capture gagal", { description: result.error });
      return captureFromWebcam(beautyFilter);
    }
    return captureFromWebcam(beautyFilter);
  }, [cameraMode, captureFromWebcam]);

  return {
    videoRef,
    cameraReady, setCameraReady,
    cameraError,
    cameraMode,
    cameraName,
    capturing,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
