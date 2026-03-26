import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import phimmLogo from "@/assets/phimm-logo.png";
import { cn } from "@/lib/utils";
import { Delete, Check, Mail, KeyRound, Loader2 } from "lucide-react";

export function LoginScreen() {
  const { loginWithPin, loginWithEmail } = useAuth();
  const [mode, setMode] = useState<"pin" | "email">("pin");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; role: string } | null>(null);

  const handlePinInput = async (digit: string) => {
    if (loading) return;
    const next = pin + digit;
    setPin(next);
    setError("");

    if (next.length === 4) {
      setLoading(true);
      const result = await loginWithPin(next);
      if (!result.success) {
        setError(result.error || "PIN ไม่ถูกต้อง");
        setPin("");
        setLoading(false);
      }
      // success → AuthContext handles redirect
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError("");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email || !password) return;
    setLoading(true);
    setError("");
    const result = await loginWithEmail(email, password);
    if (!result.success) {
      setError(result.error || "เข้าสู่ระบบไม่สำเร็จ");
    }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-[hsl(var(--surface))] border border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <img src={phimmLogo} alt="Phimm Cafe" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Phimm Cafe</h1>
          <p className="text-xs text-muted-foreground mt-0.5">POS System</p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {mode === "pin" ? (
            <>
              {/* PIN Dots */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                      i < pin.length
                        ? "bg-primary border-primary scale-110"
                        : "border-border bg-transparent"
                    )}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="text-center text-[12px] text-red-500 font-medium mb-3 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => handlePinInput(String(n))}
                    disabled={loading || pin.length >= 4}
                    className="h-16 rounded-xl bg-muted/50 hover:bg-muted text-foreground text-xl font-semibold transition-all active:scale-95 disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  disabled={loading || pin.length === 0}
                  className="h-16 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center"
                >
                  <Delete size={20} />
                </button>
                <button
                  onClick={() => handlePinInput("0")}
                  disabled={loading || pin.length >= 4}
                  className="h-16 rounded-xl bg-muted/50 hover:bg-muted text-foreground text-xl font-semibold transition-all active:scale-95 disabled:opacity-40"
                >
                  0
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading || pin.length === 0}
                  className="h-16 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                >
                  ลบ
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center mt-4 gap-2 text-primary">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium">กำลังตรวจสอบ...</span>
                </div>
              )}

              {/* Toggle to Email */}
              <button
                onClick={() => { setMode("email"); setError(""); setPin(""); }}
                className="w-full mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail size={12} />
                เข้าสู่ระบบด้วย Email
              </button>
            </>
          ) : (
            <>
              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="email@example.com"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="text-[12px] text-red-500 font-medium animate-in fade-in">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-11 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  เข้าสู่ระบบ
                </button>
              </form>

              {/* Toggle to PIN */}
              <button
                onClick={() => { setMode("pin"); setError(""); }}
                className="w-full mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <KeyRound size={12} />
                เข้าสู่ระบบด้วย PIN
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
