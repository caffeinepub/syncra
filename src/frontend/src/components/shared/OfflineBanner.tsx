import { RefreshCw, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export function OfflineBanner() {
  const { isOnline } = useAppContext();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.52 0.14 73) 0%, oklch(0.58 0.16 65) 100%)",
            color: "oklch(0.12 0.01 264)",
          }}
        >
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode — Sync Pending</span>
          <RefreshCw className="h-3.5 w-3.5 animate-spin opacity-60" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
