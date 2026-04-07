import { motion } from "framer-motion";

import doodle01 from "@/assets/doodle-01-package.png";
import doodle02 from "@/assets/doodle-02-payment.png";
import doodle03 from "@/assets/doodle-03-frame.png";
import doodle04 from "@/assets/doodle-04-session.png";
import doodle05 from "@/assets/doodle-05-filter.png";
import doodle06 from "@/assets/doodle-06-retake.png";
import doodle07 from "@/assets/doodle-07-memory.png";
import doodle08 from "@/assets/doodle-08-done.png";

interface Props {
  onContinue: () => void;
}

const steps = [
  { num: "01", title: "choose your package", image: doodle01 },
  { num: "02", title: "choose your payment method", image: doodle02, labels: ["QRIS/CASHLESS", "VOUCHER"] },
  { num: "03", title: "select your favorite frame", image: doodle03 },
  { num: "04", title: "start photo session", image: doodle04 },
  { num: "05", title: "choose photo filter", image: doodle05 },
  { num: "06", title: "feel free to snap another one if you're not loving the shot", image: doodle06, labels: ["RETAKE"] },
  { num: "07", title: "You've just created a new memory.", image: doodle07, labels: ["PRINT"] },
  { num: "08", title: "get your physical photo and scan the QR code to get the digital one", image: doodle08 },
];

const KioskInstructionsScreen = ({ onContinue }: Props) => (
  <motion.button
    key="instructions"
    type="button"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-40 jebox-blue-bg flex flex-col cursor-pointer overflow-y-auto"
    onClick={onContinue}
    aria-label="Tap to continue"
  >
    <div className="pointer-events-none flex-1 flex flex-col items-center justify-center px-6 py-8">
      <h1 className="text-4xl sm:text-6xl font-light text-primary-foreground tracking-jebox mb-10 text-center">
        INSTRUCTIONS
      </h1>

      <div className="grid grid-cols-4 gap-4 sm:gap-6 max-w-5xl w-full">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col items-center text-center"
          >
            <div className="text-4xl sm:text-5xl font-bold text-primary-foreground/90 font-script mb-1">
              {step.num}
            </div>

            <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center mb-2">
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-full object-contain brightness-0 invert opacity-90"
                loading="lazy"
                width={512}
                height={512}
              />
            </div>

            {step.labels && (
              <div className="flex flex-col gap-1 mb-1.5">
                {step.labels.map((label) => (
                  <div
                    key={label}
                    className="bg-accent text-accent-foreground text-[10px] sm:text-xs font-bold px-3 py-1 tracking-wider"
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}

            <p className="text-primary-foreground/80 text-xs sm:text-sm tracking-wide leading-relaxed">
              {step.title}
            </p>
          </motion.div>
        ))}
      </div>

      <p className="text-primary-foreground/40 text-xs mt-8 animate-pulse tracking-jebox">
        TAP TO CONTINUE
      </p>
    </div>
  </motion.button>
);

export default KioskInstructionsScreen;
