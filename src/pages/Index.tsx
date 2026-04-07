import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";

const floatingPhotos = [
  { x: "-12%", y: "15%", rotate: -12, delay: 0, size: "w-28 h-36" },
  { x: "80%", y: "10%", rotate: 8, delay: 0.3, size: "w-24 h-32" },
  { x: "-8%", y: "65%", rotate: 15, delay: 0.6, size: "w-20 h-28" },
  { x: "85%", y: "60%", rotate: -10, delay: 0.9, size: "w-26 h-34" },
  { x: "15%", y: "80%", rotate: 6, delay: 1.2, size: "w-20 h-28" },
  { x: "70%", y: "82%", rotate: -8, delay: 0.5, size: "w-22 h-30" },
];

const Index = () => {
  const [flashing, setFlashing] = useState(false);
  const navigate = useNavigate();

  const handleStartPhoto = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setFlashing(true);
    // Navigate after flash animation
    setTimeout(() => navigate("/kiosk"), 800);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Camera flash overlay */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.7, times: [0, 0.1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Shutter bars */}
      <AnimatePresence>
        {flashing && (
          <>
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: ["−100%", "0%", "0%", "-100%"] }}
              transition={{ duration: 0.7, times: [0, 0.15, 0.5, 0.8] }}
              className="fixed top-0 left-0 right-0 h-1/2 bg-background z-[49]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: ["100%", "0%", "0%", "100%"] }}
              transition={{ duration: 0.7, times: [0, 0.15, 0.5, 0.8] }}
              className="fixed bottom-0 left-0 right-0 h-1/2 bg-background z-[49]"
            />
          </>
        )}
      </AnimatePresence>

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary rounded-full blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-accent rounded-full blur-[120px]"
        />
      </div>

      {/* Floating polaroid frames */}
      {floatingPhotos.map((photo, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 0.15, 0.15, 0.15],
            scale: 1,
            y: [0, -15, 0],
          }}
          transition={{
            opacity: { delay: photo.delay + 0.5, duration: 1 },
            scale: { delay: photo.delay + 0.5, duration: 0.8 },
            y: { delay: photo.delay + 1.5, duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ left: photo.x, top: photo.y, rotate: `${photo.rotate}deg` }}
          className={`absolute ${photo.size} rounded-lg border-2 border-border/30 bg-card/30 backdrop-blur-sm`}
        >
          <div className="w-full h-3/4 bg-muted/40 rounded-t-md" />
          <div className="w-1/2 h-1 bg-muted-foreground/20 rounded mx-auto mt-2" />
        </motion.div>
      ))}

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center relative z-10 max-w-lg"
      >
        {/* Animated camera icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 200 }}
          className="relative w-28 h-28 mx-auto mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-3xl border border-dashed border-primary/30"
          />
          <div className="absolute inset-2 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Camera className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2, ease: "easeInOut" }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full blur-md"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
        >
          <span className="text-gradient-primary">ZMI</span>{" "}
          <span className="text-foreground">Photobox</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-lg text-muted-foreground mb-10"
        >
          Abadikan momen spesialmu dengan foto berkualitas studio.
          <br />
          <span className="text-foreground/70">Sentuh layar untuk mulai!</span>
        </motion.p>

        {/* CTA with pulse ring + flash on click */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="relative inline-block"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary rounded-2xl blur-md"
          />
          <button
            onClick={handleStartPhoto}
            className="relative inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold px-8 py-4 rounded-2xl text-lg hover:opacity-90 transition-opacity hover-scale cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            Mulai Foto Sekarang
          </button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center text-xs text-muted-foreground">
        ZMI Photobox System v1.0
      </footer>
    </div>
  );
};

export default Index;
