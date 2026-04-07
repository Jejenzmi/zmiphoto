import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Cloud } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";

interface Props {
  pendingCount?: number;
}

const OfflineIndicator = ({ pendingCount = 0 }: Props) => {
  const { isOnline } = useOfflineMode();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <WifiOff className="w-4 h-4" />
          <span>Offline — foto disimpan lokal</span>
          {pendingCount > 0 && (
            <span className="bg-destructive-foreground/20 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} tertunda
            </span>
          )}
        </motion.div>
      )}
      {isOnline && pendingCount > 0 && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Cloud className="w-4 h-4 animate-pulse" />
          <span>Mengupload {pendingCount} foto tertunda...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
