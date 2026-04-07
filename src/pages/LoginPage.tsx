import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, LogIn, Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        const roles = (roleData || []).map(r => r.role);
        if (roles.includes("superadmin")) navigate("/superadmin");
        else if (roles.includes("admin")) navigate("/admin");
        else if (roles.includes("operator")) navigate("/operator");
        else if (roles.includes("venue")) navigate("/venue");
        else if (roles.includes("partner")) navigate("/partner");
        else navigate("/admin");
      } else {
        navigate("/admin");
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error("Gagal mengirim email", { description: error.message });
    } else {
      setForgotSent(true);
      toast.success("Email reset password terkirim!");
    }
  };

  // Forgot Password Mode
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button
            onClick={() => { setForgotMode(false); setForgotSent(false); }}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Kembali ke Login</span>
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Lupa Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Masukkan email Anda untuk menerima link reset password
            </p>
          </div>

          {forgotSent ? (
            <div className="text-center space-y-4">
              <div className="bg-primary/10 rounded-xl p-4">
                <p className="text-sm text-foreground font-medium">📧 Email terkirim!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cek inbox <strong>{forgotEmail}</strong> untuk link reset password.
                  Periksa juga folder spam.
                </p>
              </div>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); }}
                className="text-sm text-primary hover:underline"
              >
                Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="email@contoh.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {forgotLoading ? "Mengirim..." : "Kirim Link Reset"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali</span>
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Masuk</h1>
          <p className="text-sm text-muted-foreground mt-1">ZMI Photobox — Pusat Kontrol</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@zmi.app"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => { setForgotMode(true); setForgotEmail(email); }}
              className="text-xs text-primary hover:underline"
            >
              Lupa password?
            </button>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
