/**
 * Camera service: auto-detects in order:
 * 1. Canon DSLR via localhost bridge
 * 2. External USB webcam
 * 3. Internal webcam (front-facing)
 */

const BRIDGE_URL = "http://localhost:8080";

export type CameraMode = "dslr" | "external-webcam" | "webcam" | "detecting";

export interface CameraStatus {
  mode: CameraMode;
  connected: boolean;
  cameraName?: string;
  deviceId?: string;
  message: string;
}

export interface CaptureResult {
  success: boolean;
  photo: string; // base64 data URL
  error?: string;
}

/** Check if Canon DSLR bridge is running */
export async function checkDSLRBridge(): Promise<CameraStatus | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch(`${BRIDGE_URL}/status`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const data = await resp.json();
    if (data.connected) {
      return {
        mode: "dslr",
        connected: true,
        cameraName: data.camera?.model || "Canon DSLR",
        message: data.message || "Canon DSLR terhubung",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Enumerate video devices and find external vs internal webcam */
async function detectWebcam(): Promise<CameraStatus> {
  try {
    // Request permission first to get device labels
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    tempStream.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    if (videoDevices.length === 0) {
      return { mode: "webcam", connected: false, message: "Tidak ada kamera terdeteksi" };
    }

    // Try to find external camera (USB webcam — not "front" or "facetime" or "integrated")
    const internalKeywords = ["front", "facetime", "integrated", "built-in", "ir camera", "internal"];
    const externalCam = videoDevices.find(
      (d) => !internalKeywords.some((kw) => d.label.toLowerCase().includes(kw))
    );

    // If there's more than 1 camera and we found one that's not internal, prefer it
    if (externalCam && videoDevices.length > 1) {
      return {
        mode: "external-webcam",
        connected: true,
        cameraName: externalCam.label || "External Camera",
        deviceId: externalCam.deviceId,
        message: `Kamera eksternal terdeteksi: ${externalCam.label}`,
      };
    }

    // Fallback to first available (internal)
    const cam = videoDevices[0];
    return {
      mode: "webcam",
      connected: true,
      cameraName: cam.label || "Internal Webcam",
      deviceId: cam.deviceId,
      message: `Menggunakan ${cam.label || "webcam internal"}`,
    };
  } catch {
    return { mode: "webcam", connected: false, message: "Kamera tidak tersedia. Pastikan izin kamera diaktifkan." };
  }
}

/** Full auto-detection: DSLR → External Webcam → Internal Webcam */
export async function autoDetectCamera(): Promise<CameraStatus> {
  // 1. Try DSLR bridge
  const dslr = await checkDSLRBridge();
  if (dslr) return dslr;

  // 2. Detect webcams (external preferred)
  return await detectWebcam();
}

/** Get preferred MediaStream constraints based on detected camera */
export function getMediaConstraints(status: CameraStatus): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 960 },
  };

  if (status.deviceId) {
    video.deviceId = { exact: status.deviceId };
  } else {
    video.facingMode = "user";
  }

  return { video, audio: false };
}

/** Capture photo from DSLR via bridge */
export async function captureDSLR(): Promise<CaptureResult> {
  try {
    const resp = await fetch(`${BRIDGE_URL}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Capture failed" }));
      throw new Error(err.error || err.hint || "Capture failed");
    }

    const data = await resp.json();
    if (data.success && data.photo) {
      return { success: true, photo: data.photo };
    }
    throw new Error("No photo returned");
  } catch (e: any) {
    return { success: false, photo: "", error: e.message };
  }
}

/** Get DSLR live view preview frame */
export async function getDSLRPreview(): Promise<string | null> {
  try {
    const resp = await fetch(`${BRIDGE_URL}/preview`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.success ? data.preview : null;
  } catch {
    return null;
  }
}

/** Update DSLR settings */
export async function setDSLRSettings(settings: {
  iso?: string;
  shutterspeed?: string;
  aperture?: string;
}): Promise<boolean> {
  try {
    const resp = await fetch(`${BRIDGE_URL}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
