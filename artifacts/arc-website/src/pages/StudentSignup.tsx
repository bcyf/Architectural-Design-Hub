import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { User, Mail, Lock, Eye, EyeOff, IdCard, GraduationCap, Camera } from "lucide-react";
import { setStudentToken } from "@/lib/student-auth";

const COLLEGE_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate", "Postgraduate"];

async function uploadProfilePicture(file: File): Promise<string> {
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const { uploadURL, objectPath } = await urlRes.json();
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return objectPath;
}

export default function StudentSignup() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", studentId: "", password: "", confirmPassword: "", collegeLevel: "1st Year" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      let profilePicture: string | undefined;
      if (avatarFile) {
        profilePicture = await uploadProfilePicture(avatarFile);
      }

      const res = await fetch("/api/students/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          studentId: form.studentId,
          password: form.password,
          collegeLevel: form.collegeLevel,
          profilePicture,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      setStudentToken(data.token);
      setLocation("/profile");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="ASA FBC Logo" className="w-12 h-12 object-contain mb-3" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Create Student Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Architecture Student Association FBC</p>
        </div>

        <div className="border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground mb-6">Sign up with your student ID to access exclusive resources and the gallery.</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Profile picture picker */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center transition-colors group-hover:border-primary">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Profile picture (optional)</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input name="firstName" type="text" required value={form.firstName} onChange={handleChange} placeholder="First"
                    className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                <input name="lastName" type="text" required value={form.lastName} onChange={handleChange} placeholder="Last"
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="your@email.com"
                  className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Student ID</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="studentId" type="text" required value={form.studentId} onChange={handleChange} placeholder="e.g. STU-2024-001"
                  className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Your official university student ID.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">College Year / Level</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select name="collegeLevel" value={form.collegeLevel} onChange={handleChange}
                  className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors appearance-none">
                  {COLLEGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="password" type={showPassword ? "text" : "password"} required value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full border border-border bg-background pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
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
                <input name="confirmPassword" type={showPassword ? "text" : "password"} required value={form.confirmPassword} onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 transition-colors text-sm mt-2">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
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
