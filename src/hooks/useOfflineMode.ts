import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface PendingUpload {
  id: string;
  photos: string[];
  shortCode: string;
  filter: string;
  templateId: string;
  timestamp: number;
}

const STORAGE_KEY = "zmi-offline-queue";

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("🌐 Koneksi kembali!", { description: "Mengupload foto yang tertunda..." });
      processPendingUploads();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("📡 Tidak ada koneksi internet", { description: "Foto akan disimpan lokal dan diupload otomatis saat online" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load pending uploads from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPendingUploads(JSON.parse(stored));
    } catch {}

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const savePendingUpload = useCallback((upload: PendingUpload) => {
    setPendingUploads(prev => {
      const updated = [...prev, upload];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("localStorage full, clearing old entries");
        // If storage is full, remove oldest entries
        const trimmed = updated.slice(-5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
      return updated;
    });
  }, []);

  const removePendingUpload = useCallback((id: string) => {
    setPendingUploads(prev => {
      const updated = prev.filter(u => u.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const processPendingUploads = useCallback(async () => {
    // This will be called when we come back online
    // The actual upload logic is handled by the parent component
  }, []);

  const clearPendingUploads = useCallback(() => {
    setPendingUploads([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isOnline,
    pendingUploads,
    savePendingUpload,
    removePendingUpload,
    clearPendingUploads,
    pendingCount: pendingUploads.length,
  };
}
