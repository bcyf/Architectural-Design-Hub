import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/students/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setResetUrl(data.resetUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {!resetUrl ? (
            <>
              <h2 className="font-semibold text-lg mb-1">Reset your password</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Enter your registered email address and we'll generate a reset link for you.
              </p>

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
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="your@email.com"
                      className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 transition-colors text-sm mt-2"
                >
                  {loading ? "Generating link…" : "Generate Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="font-semibold text-lg mb-2 text-center">Reset link ready</h2>
              <p className="text-muted-foreground text-sm mb-5 text-center">
                Copy the link below and open it in your browser to set a new password. This link expires in 1 hour.
              </p>

              <div className="bg-muted border border-border p-3 rounded text-xs break-all text-muted-foreground mb-3 font-mono select-all">
                {resetUrl}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                </button>
                <a
                  href={resetUrl}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Open Now
                </a>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          <a href="/" className="hover:text-foreground transition-colors">← Back to public site</a>
        </p>
      </div>
    </div>
  );
}
