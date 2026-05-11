import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { setStudentToken } from "@/lib/student-auth";

export default function StudentLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      setStudentToken(data.token);
      setLocation("/resources");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="ASA FBC Logo"
            className="w-12 h-12 object-contain mb-3"
          />
          <h1 className="text-2xl font-display font-bold tracking-tight">Student Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Architecture Student Association FBC</p>
        </div>

        {/* Card */}
        <div className="border border-border bg-card p-8">
          <h2 className="font-semibold text-lg mb-1">Sign in</h2>
          <p className="text-muted-foreground text-sm mb-6">Access resources and the gallery.</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" placeholder="your@email.com"
                  className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" placeholder="Your password"
                  className="w-full border border-border bg-background pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 transition-colors text-sm mt-2">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          <a href="/" className="hover:text-foreground transition-colors">← Back to public site</a>
        </p>
      </div>
    </div>
  );
}
