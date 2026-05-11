import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Lock, Eye, EyeOff, Check } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/students/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed. The link may have expired.");
        return;
      }
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-destructive font-medium mb-4">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-primary hover:underline text-sm">Request a new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="ASA FBC Logo"
            className="w-12 h-12 object-contain mb-3"
          />
          <h1 className="text-2xl font-display font-bold tracking-tight">Student Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Architecture Student Association FBC</p>
        </div>

        <div className="border border-border bg-card p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Password updated!</h2>
              <p className="text-muted-foreground text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-lg mb-1">Set new password</h2>
              <p className="text-muted-foreground text-sm mb-6">Choose a strong password for your account.</p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full border border-border bg-background pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 transition-colors text-sm mt-2"
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/forgot-password" className="text-primary hover:underline font-medium">Request a new link</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          <a href="/" className="hover:text-foreground transition-colors">← Back to public site</a>
        </p>
      </div>
    </div>
  );
}
