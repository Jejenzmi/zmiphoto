import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, CheckCircle, XCircle, RefreshCw, ArrowLeft, Search, Smartphone, Ticket, CreditCard, Wallet, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playPaymentSuccess, playError, playQrReady } from "@/services/audioService";
import type { Template } from "@/hooks/useKioskState";

interface Props {
  template: Template;
  kioskId: string | null;
  allowedMethods?: string[];
  onPaymentSuccess: (transactionId: string) => void;
  onSimulatePayment: () => void;
  onBack: () => void;
}

type PaymentState = "select_method" | "loading" | "waiting" | "success" | "failed" | "error" | "voucher" | "voucher_loading" | "voucher_success" | "voucher_error";

type PaymentMethodInfo = {
  key: string;
  label: string;
  icon: React.ReactNode;
  category: "qris" | "ewallet" | "va";
};

const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { key: "qris", label: "QRIS", icon: <Smartphone className="w-10 h-10" />, category: "qris" },
  { key: "ovo", label: "OVO", icon: <Wallet className="w-10 h-10" />, category: "ewallet" },
  { key: "shopeepay", label: "ShopeePay", icon: <Wallet className="w-10 h-10" />, category: "ewallet" },
  { key: "dana", label: "DANA", icon: <Wallet className="w-10 h-10" />, category: "ewallet" },
  { key: "linkaja", label: "LinkAja", icon: <Wallet className="w-10 h-10" />, category: "ewallet" },
  { key: "va_bca", label: "VA BCA", icon: <Building2 className="w-10 h-10" />, category: "va" },
  { key: "va_bni", label: "VA BNI", icon: <Building2 className="w-10 h-10" />, category: "va" },
  { key: "va_bri", label: "VA BRI", icon: <Building2 className="w-10 h-10" />, category: "va" },
  { key: "va_mandiri", label: "VA Mandiri", icon: <Building2 className="w-10 h-10" />, category: "va" },
];

const KioskPaymentScreen = ({ template, kioskId, allowedMethods, onPaymentSuccess, onSimulatePayment, onBack: onBackToSelection }: Props) => {
  const [paymentState, setPaymentState] = useState<PaymentState>("select_method");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [qrisContent, setQrisContent] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [vaNumber, setVaNumber] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 minutes
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkCountRef = useRef(0);
  const createdAtRef = useRef<number>(0);

  // Filter available methods based on allowedMethods from kiosk config
  const availableMethods = PAYMENT_METHODS.filter((m) => {
    if (!allowedMethods || allowedMethods.length === 0 || allowedMethods.includes("all")) return true;
    return allowedMethods.includes(m.key);
  });

  const createPayment = async (method: string) => {
    setPaymentState("loading");
    setSelectedMethod(method);
    setErrorMsg(null);
    setQrisContent(null);
    setQrUrl(null);
    setVaNumber(null);
    setPaymentUrl(null);
    checkCountRef.current = 0;

    try {
      const { data, error } = await supabase.functions.invoke("flip-create-bill", {
        body: {
          amount: template.price,
          kiosk_id: kioskId,
          template_name: template.name,
          payment_method: method,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // QRIS
      if (data.qr_string) setQrisContent(data.qr_string);
      if (data.qr_url) setQrUrl(data.qr_url);
      // VA
      if (data.va_number) setVaNumber(data.va_number);
      // E-wallet redirect
      if (data.payment_url) setPaymentUrl(data.payment_url);

      setTransactionId(data.transaction_id);
      createdAtRef.current = Date.now();
      setPaymentState("waiting");
      playQrReady();
    } catch (e: any) {
      console.error("Failed to create payment:", e);
      setErrorMsg(e.message || "Gagal membuat pembayaran");
      setPaymentState("error");
    }
  };

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPaymentState("select_method");
    setSelectedMethod(null);
    setTransactionId(null);
    setQrisContent(null);
    setQrUrl(null);
    setVaNumber(null);
    setPaymentUrl(null);
    setVoucherCode("");
    setVoucherError(null);
  };

  const redeemVoucher = async () => {
    if (!voucherCode.trim()) return;
    setPaymentState("voucher_loading");
    setVoucherError(null);
    try {
      const { data: voucher, error: lookupErr } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", voucherCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (lookupErr) throw new Error("Gagal memverifikasi voucher");
      if (!voucher) {
        setVoucherError("Voucher tidak ditemukan atau tidak aktif");
        setPaymentState("voucher_error");
        return;
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        setVoucherError("Voucher sudah expired");
        setPaymentState("voucher_error");
        return;
      }

      if (voucher.used_count >= voucher.max_uses) {
        setVoucherError("Voucher sudah habis digunakan");
        setPaymentState("voucher_error");
        return;
      }

      let finalAmount = template.price;
      if (voucher.discount_type === "free") {
        finalAmount = 0;
      } else if (voucher.discount_type === "fixed") {
        finalAmount = Math.max(0, template.price - voucher.discount_value);
      } else if (voucher.discount_type === "percentage") {
        finalAmount = Math.max(0, Math.round(template.price * (1 - voucher.discount_value / 100)));
      }

      await supabase
        .from("vouchers")
        .update({ used_count: voucher.used_count + 1 })
        .eq("id", voucher.id);

      const kioskIdToUse = kioskId;
      let fallbackId: string | null = null;
      if (!kioskIdToUse) {
        const { data: kiosks } = await supabase.from("kiosks").select("id").limit(1);
        fallbackId = kiosks?.[0]?.id || null;
      }

      const { data: txn } = await supabase
        .from("transactions")
        .insert({
          kiosk_id: kioskIdToUse || fallbackId,
          amount: finalAmount,
          payment_status: "paid",
          payment_method: "voucher",
        })
        .select("id")
        .single();

      playPaymentSuccess();
      setPaymentState("voucher_success");

      if (txn) {
        setTimeout(() => onPaymentSuccess(txn.id), 2000);
      } else {
        setTimeout(() => onPaymentSuccess(""), 2000);
      }
    } catch (e: any) {
      console.error("Voucher redeem error:", e);
      setVoucherError(e.message || "Gagal redeem voucher");
      setPaymentState("voucher_error");
    }
  };

  // Realtime listener for instant webhook-driven updates
  useEffect(() => {
    if (paymentState !== "waiting" || !transactionId) return;

    const channel = supabase
      .channel(`txn-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          if (payload.new.payment_status === "paid") {
            setPaymentState("success");
            playPaymentSuccess();
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(() => onPaymentSuccess(transactionId), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentState, transactionId]);

  // Poll as fallback for payment status
  useEffect(() => {
    if (paymentState !== "waiting" || !transactionId) return;

    const checkStatus = async () => {
      checkCountRef.current += 1;
      try {
        const { data, error } = await supabase.functions.invoke("qris-check-status", {
          body: { transaction_id: transactionId },
        });
        if (error) {
          console.error("Check status error:", error);
          return;
        }
        if (data?.paid) {
          setPaymentState("success");
          playPaymentSuccess();
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => onPaymentSuccess(transactionId), 2000);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }

      if (checkCountRef.current >= 30) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPaymentState("failed");
        setErrorMsg("Pembayaran expired");
        playError();
      }
    };

    const initialTimeout = setTimeout(() => {
      checkStatus();
      pollRef.current = setInterval(checkStatus, 60000);
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentState, transactionId]);

  // Countdown timer (30 min from creation)
  useEffect(() => {
    if (paymentState !== "waiting" || !createdAtRef.current) return;

    const expiryTime = createdAtRef.current + 30 * 60 * 1000;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        setPaymentState("failed");
        setErrorMsg("Pembayaran expired");
        playError();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentState]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const getMethodInfo = () => PAYMENT_METHODS.find((m) => m.key === selectedMethod);

  return (
    <AnimatePresence mode="wait">
      {/* Method Selection */}
      {paymentState === "select_method" && (
        <motion.div
          key="summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 jebox-blue-bg flex flex-col items-center justify-center relative px-6"
        >
          <button
            onClick={onBackToSelection}
            className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl sm:text-4xl font-light text-primary-foreground/80 tracking-jebox mb-2 text-center">
            PILIH PEMBAYARAN
          </h1>
          <p className="text-primary-foreground/50 text-sm mb-8 tracking-wider">
            Total: Rp {template.price.toLocaleString("id-ID")}
          </p>

          {/* Payment method grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-2xl w-full mb-8">
            {availableMethods.map((method) => (
              <motion.button
                key={method.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => createPayment(method.key)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-primary-foreground/20 hover:border-primary-foreground/50 transition-colors group"
              >
                <div className="text-primary-foreground/60 group-hover:text-primary-foreground/90 transition-colors">
                  {method.icon}
                </div>
                <span className="text-primary-foreground/70 text-xs tracking-wider font-medium">
                  {method.label}
                </span>
              </motion.button>
            ))}

            {/* Voucher button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaymentState("voucher")}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-primary-foreground/20 hover:border-primary-foreground/50 transition-colors group"
            >
              <div className="text-primary-foreground/60 group-hover:text-primary-foreground/90 transition-colors">
                <Ticket className="w-10 h-10" />
              </div>
              <span className="text-primary-foreground/70 text-xs tracking-wider font-medium">
                VOUCHER
              </span>
            </motion.button>
          </div>

          <button
            onClick={onSimulatePayment}
            className="mt-4 text-xs text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors"
          >
            [Demo] Simulasi Pembayaran
          </button>
        </motion.div>
      )}

      {/* VOUCHER screen */}
      {(paymentState === "voucher" || paymentState === "voucher_loading" || paymentState === "voucher_success" || paymentState === "voucher_error") && (
        <motion.div
          key="voucher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 jebox-blue-bg flex flex-col items-center justify-center px-6"
        >
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="text-4xl sm:text-5xl font-light text-primary-foreground/80 tracking-jebox mb-16 text-center">
            VOUCHER
          </h1>

          <AnimatePresence mode="wait">
            {paymentState === "voucher_success" && (
              <motion.div key="v-success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-4">
                <CheckCircle className="w-20 h-20 text-accent" />
                <p className="text-primary-foreground font-bold text-xl">Voucher Berhasil! 🎉</p>
                <p className="text-primary-foreground/60 text-sm">Memulai sesi foto...</p>
              </motion.div>
            )}

            {paymentState === "voucher_loading" && (
              <motion.div key="v-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
                <p className="text-primary-foreground/60 text-sm">Memverifikasi voucher...</p>
              </motion.div>
            )}

            {(paymentState === "voucher" || paymentState === "voucher_error") && (
              <motion.div key="v-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6 w-full max-w-md">
                <div className="w-full relative">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && redeemVoucher()}
                    placeholder="Masukkan kode voucher"
                    className="w-full bg-transparent border-2 border-primary-foreground/30 rounded-full py-4 px-6 text-primary-foreground text-center tracking-wider text-lg placeholder:text-primary-foreground/30 focus:outline-none focus:border-primary-foreground/60"
                  />
                  <button
                    onClick={redeemVoucher}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-primary-foreground/10 rounded-full transition-colors"
                  >
                    <Search className="w-6 h-6 text-primary-foreground/50" />
                  </button>
                </div>

                {voucherError && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="text-red-300 text-sm text-center">
                    {voucherError}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={redeemVoucher}
                  disabled={!voucherCode.trim()}
                  className="w-full max-w-xs py-3 rounded-full bg-primary-foreground/20 text-primary-foreground font-semibold tracking-wider hover:bg-primary-foreground/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  REDEEM
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Payment Screen (QRIS/VA/E-wallet) */}
      {(paymentState === "loading" || paymentState === "waiting" || paymentState === "success" || paymentState === "failed" || paymentState === "error") && (
        <motion.div
          key="payment"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 jebox-blue-bg flex flex-col items-center justify-center px-6"
        >
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="text-3xl sm:text-4xl font-light text-primary-foreground/80 tracking-jebox mb-8 text-center">
            {getMethodInfo()?.label || "PEMBAYARAN"}
          </h1>

          <AnimatePresence mode="wait">
            {paymentState === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
                <p className="text-primary-foreground/60 text-sm">Membuat pembayaran...</p>
              </motion.div>
            )}

            {paymentState === "waiting" && (
              <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6">

                {/* QRIS - Show QR code */}
                {(qrisContent || qrUrl) && (
                  <div className="bg-white p-6 rounded-lg">
                    {qrisContent ? (
                      <QRCodeSVG value={qrisContent} size={240} level="M" />
                    ) : qrUrl ? (
                      <img src={qrUrl} alt="QRIS" className="w-60 h-60" />
                    ) : null}
                  </div>
                )}

                {/* VA - Show account number */}
                {vaNumber && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-primary-foreground/50 text-sm">Nomor Virtual Account:</p>
                    <div className="bg-primary-foreground/10 rounded-xl px-8 py-4 border border-primary-foreground/20">
                      <p className="text-primary-foreground font-mono text-2xl tracking-widest select-all">
                        {vaNumber}
                      </p>
                    </div>
                    <p className="text-primary-foreground/40 text-xs">Transfer tepat sesuai nominal</p>
                  </div>
                )}

                {/* E-wallet - Show redirect link */}
                {paymentUrl && !qrisContent && !qrUrl && !vaNumber && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-primary-foreground/50 text-sm text-center">
                      Buka link berikut di HP Anda untuk melakukan pembayaran:
                    </p>
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={paymentUrl} size={200} level="M" />
                    </div>
                    <p className="text-primary-foreground/40 text-xs">Scan QR untuk membuka halaman pembayaran</p>
                  </div>
                )}

                <div className="text-primary-foreground/60 text-sm tracking-wider">
                  RP. <span className="text-primary-foreground font-bold text-2xl">{template.price.toLocaleString("id-ID")}</span>
                </div>
                <div className="text-xs text-primary-foreground/40 tracking-wider">
                  Berlaku {formatTime(timeLeft)}
                </div>
                <p className="text-primary-foreground/30 text-xs max-w-xs text-center">
                  {selectedMethod?.startsWith("va_")
                    ? "Transfer ke nomor VA di atas melalui ATM, mobile banking, atau internet banking"
                    : "Scan QR di atas menggunakan e-wallet atau mobile banking Anda"}
                </p>
              </motion.div>
            )}

            {paymentState === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-4">
                <CheckCircle className="w-20 h-20 text-accent" />
                <p className="text-primary-foreground font-bold text-xl">Pembayaran Berhasil! 🎉</p>
                <p className="text-primary-foreground/60 text-sm">Memulai sesi foto...</p>
              </motion.div>
            )}

            {(paymentState === "failed" || paymentState === "error") && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4">
                <XCircle className="w-16 h-16 text-destructive" />
                <p className="text-primary-foreground font-bold">
                  {paymentState === "failed" ? "Pembayaran Gagal / Expired" : "Error"}
                </p>
                {errorMsg && <p className="text-primary-foreground/50 text-xs">{errorMsg}</p>}
                <button onClick={() => selectedMethod && createPayment(selectedMethod)}
                  className="flex items-center gap-2 text-accent hover:underline text-sm">
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KioskPaymentScreen;
