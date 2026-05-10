import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Mail, IdCard, GraduationCap, Camera, Save, Check,
  BookOpen, Calendar, Edit2, ArrowLeft, Layers, MessageSquare
} from "lucide-react";

const COLLEGE_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate", "Postgraduate"];

const LEVEL_COLORS: Record<string, string> = {
  "1st Year": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "2nd Year": "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  "3rd Year": "bg-teal-500/10 text-teal-600 border-teal-500/30",
  "4th Year": "bg-green-500/10 text-green-600 border-green-500/30",
  "5th Year": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "Graduate": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  "Postgraduate": "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getStudentToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Request failed"); }
  return res.json();
}

async function uploadImage(file: File): Promise<string> {
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const { uploadURL, objectPath } = await urlRes.json();
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return objectPath;
}

function Avatar({ src, name, size = "lg" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-20 h-20 text-xl", xl: "w-28 h-28 text-3xl" };
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  if (src) {
    return <img src={`/api/storage/objects${src.replace(/^\/objects/, "")}`} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeMap[size]} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border-2 border-primary/20`}>
      {initials}
    </div>
  );
}

export { Avatar };

export default function StudentProfile() {
  const qc = useQueryClient();
  const me = getStudentPayload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [form, setForm] = useState({ firstName: "", lastName: "", bio: "", collegeLevel: "1st Year" });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => apiFetch("/students/me/profile"),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch("/groups"),
  });

  useEffect(() => {
    if (profile) {
      setForm({ firstName: profile.firstName, lastName: profile.lastName, bio: profile.bio || "", collegeLevel: profile.collegeLevel || "1st Year" });
    }
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: (data: any) => apiFetch("/students/me/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-profile"] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const objectPath = await uploadImage(file);
      await apiFetch("/students/me/profile", { method: "PATCH", body: JSON.stringify({ profilePicture: objectPath }) });
      qc.invalidateQueries({ queryKey: ["student-profile"] });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    updateMut.mutate(form);
  }

  const myGroups = groups.filter((g: any) => g.isMember);
  const joinedDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading profile…</div>
      </PageWrapper>
    );
  }

  const displayPic = avatarPreview || (profile?.profilePicture ? `/api/storage/objects${profile.profilePicture.replace(/^\/objects/, "")}` : null);

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Profile Card */}
        <div className="border border-border bg-card mb-8">
          {/* Cover */}
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

          <div className="px-6 pb-6">
            {/* Avatar + actions row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full border-4 border-card overflow-hidden bg-muted flex items-center justify-center">
                  {displayPic ? (
                    <img src={displayPic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                      {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="flex items-center gap-2">
                {saved && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <Check className="w-4 h-4" /> Saved
                  </div>
                )}
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setForm({ firstName: profile?.firstName || "", lastName: profile?.lastName || "", bio: profile?.bio || "", collegeLevel: profile?.collegeLevel || "1st Year" }); }}
                      className="border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={updateMut.isPending}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      <Save className="w-4 h-4" />
                      {updateMut.isPending ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-2 border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Name + meta */}
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">First Name</label>
                    <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Last Name</label>
                    <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">College Year / Level</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={form.collegeLevel} onChange={e => setForm(p => ({ ...p, collegeLevel: e.target.value }))}
                      className="w-full border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors appearance-none">
                      {COLLEGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                    placeholder="Tell others about yourself, your interests and design focus…"
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-display font-bold">{profile?.firstName} {profile?.lastName}</h1>
                  <span className={`text-xs font-semibold px-2.5 py-1 border rounded-full ${LEVEL_COLORS[profile?.collegeLevel || "1st Year"] || "bg-muted text-muted-foreground border-border"}`}>
                    <GraduationCap className="w-3 h-3 inline mr-1" />
                    {profile?.collegeLevel || "1st Year"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile?.email}</span>
                  <span className="flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" />{profile?.studentId}</span>
                  {joinedDate && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {joinedDate}</span>}
                </div>
                {profile?.bio ? (
                  <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio yet — click Edit Profile to add one.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Groups Joined", value: myGroups.length, icon: Layers },
            { label: "College Level", value: profile?.collegeLevel || "—", icon: GraduationCap },
            { label: "Member Since", value: joinedDate || "—", icon: Calendar },
          ].map(stat => (
            <div key={stat.label} className="border border-border bg-card p-4 text-center">
              <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* My Groups */}
        {myGroups.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">My Discussion Groups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((g: any) => (
                <Link key={g.id} to={`/groups/${g.id}`}
                  className="border border-border bg-card hover:border-primary/50 transition-colors flex flex-col">
                  <div className="h-1.5" style={{ background: g.coverColor }} />
                  <div className="p-4">
                    <p className="font-semibold text-sm mb-1 line-clamp-1">{g.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{g.category} · {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {myGroups.length === 0 && (
          <div className="border border-border bg-card p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">No groups yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Join or create a discussion group to collaborate with peers.</p>
            <Link to="/groups" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Browse Groups
            </Link>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
