import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Users, Lock, Globe, Hash, Search,
  BookOpen, Layers, MessageSquare, ArrowRight, X, Check, ChevronDown, Camera, ImagePlus
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  project: Layers,
  assignment: BookOpen,
  critique: MessageSquare,
  study: Hash,
  general: Globe,
};

const CATEGORY_LABELS: Record<string, string> = {
  project: "Project",
  assignment: "Assignment",
  critique: "Critique",
  study: "Study Group",
  general: "General",
};

const COVER_COLORS = [
  "#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const ROLES = ["member", "leader", "co-leader", "designer", "researcher", "reviewer"];

const ROLE_COLORS: Record<string, string> = {
  leader: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "co-leader": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  designer: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  researcher: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  reviewer: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  member: "bg-muted text-muted-foreground border-border",
};

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getStudentToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Request failed"); }
  return res.json();
}

async function uploadFile(file: File): Promise<string> {
  const token = getStudentToken();
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const { uploadURL, objectPath } = await urlRes.json();
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return objectPath;
}

function coverSrc(path: string) {
  return `/api/storage/objects${path.replace(/^\/objects/, "")}`;
}

interface Group {
  id: number; name: string; description?: string; category: string;
  isPrivate: boolean; coverColor: string; coverImage?: string; memberCount: number; isMember: boolean; createdBy: number;
}

interface StudentResult {
  id: number; firstName: string; lastName: string; email: string; studentId: string;
}

interface InvitedMember extends StudentResult {
  role: string;
}

function MemberSearchBox({
  invitedMembers,
  onAdd,
  onRemove,
  onRoleChange,
}: {
  invitedMembers: InvitedMember[];
  onAdd: (s: StudentResult) => void;
  onRemove: (id: number) => void;
  onRoleChange: (id: number, role: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [openRoleId, setOpenRoleId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/students/search?q=${encodeURIComponent(q)}`);
        const invitedIds = invitedMembers.map(m => m.id);
        setResults(data.filter((s: StudentResult) => !invitedIds.includes(s.id)));
        setShowDropdown(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [q]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">Invite Members</label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Search by name, email or student ID…"
          className="w-full pl-9 pr-4 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>}

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg z-30 max-h-48 overflow-y-auto">
            {results.map(s => (
              <button key={s.id} type="button"
                onMouseDown={() => { onAdd(s); setQ(""); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {s.firstName[0]}{s.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-muted-foreground">{s.studentId} · {s.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {showDropdown && results.length === 0 && q.length >= 2 && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg z-30 px-4 py-3 text-sm text-muted-foreground">
            No students found
          </div>
        )}
      </div>

      {/* Invited list */}
      {invitedMembers.length > 0 && (
        <div className="mt-3 space-y-2">
          {invitedMembers.map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {m.firstName[0]}{m.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{m.studentId}</p>
              </div>
              {/* Role picker */}
              <div className="relative flex-shrink-0">
                <button type="button" onClick={() => setOpenRoleId(openRoleId === m.id ? null : m.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 border capitalize ${ROLE_COLORS[m.role]}`}>
                  {m.role} <ChevronDown className="w-3 h-3" />
                </button>
                {openRoleId === m.id && (
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border shadow-lg z-40 w-36">
                    {ROLES.map(r => (
                      <button key={r} type="button"
                        onClick={() => { onRoleChange(m.id, r); setOpenRoleId(null); }}
                        className={`w-full text-left px-3 py-2 text-xs capitalize hover:bg-muted/50 transition-colors flex items-center justify-between ${m.role === r ? "font-semibold text-primary" : ""}`}>
                        {r} {m.role === r && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => onRemove(m.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1.5">They'll be added instantly when the group is created.</p>
    </div>
  );
}

export default function Groups() {
  const qc = useQueryClient();
  const me = getStudentPayload();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState<Group | null>(null);
  const [joinRole, setJoinRole] = useState("member");
  const [form, setForm] = useState({ name: "", description: "", category: "general", isPrivate: false, coverColor: "#16a34a" });
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [formError, setFormError] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => apiFetch("/groups"),
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => apiFetch("/groups", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setForm({ name: "", description: "", category: "general", isPrivate: false, coverColor: "#16a34a" });
      setInvitedMembers([]);
      setCoverFile(null);
      setCoverPreview("");
    },
    onError: (e: any) => setFormError(e.message),
  });

  const joinMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); setShowJoinModal(null); },
  });

  async function handleCreate() {
    setFormError("");
    setCoverUploading(true);
    try {
      let coverImage: string | undefined;
      if (coverFile) coverImage = await uploadFile(coverFile);
      createMut.mutate({ ...form, coverImage, invitedMembers: invitedMembers.map(m => ({ studentId: m.id, role: m.role })) });
    } catch {
      setFormError("Failed to upload cover image. Please try again.");
      setCoverUploading(false);
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setFormError("");
    setInvitedMembers([]);
    setCoverFile(null);
    setCoverPreview("");
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  const filtered = groups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || g.category === catFilter;
    return matchSearch && matchCat;
  });

  const myGroups = filtered.filter(g => g.isMember);
  const discoverGroups = filtered.filter(g => !g.isMember);

  return (
    <PageWrapper>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Discussion Groups</h1>
            <p className="text-muted-foreground">Collaborate on projects, assignments, and design critiques.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Group
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…"
              className="w-full pl-9 pr-4 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "project", "assignment", "critique", "study", "general"].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${catFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className="text-center py-24 text-muted-foreground">Loading groups…</div>}

        {/* My Groups */}
        {myGroups.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">My Groups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map(g => <GroupCard key={g.id} group={g} mine />)}
            </div>
          </div>
        )}

        {/* Discover */}
        {discoverGroups.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Discover</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverGroups.map(g => (
                <GroupCard key={g.id} group={g} onJoin={() => { setShowJoinModal(g); setJoinRole("member"); }} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No groups found</p>
            <p className="text-sm mt-1">Be the first to create one!</p>
          </div>
        )}
      </section>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
              <h2 className="font-semibold text-lg">Create Group</h2>
              <button onClick={closeCreate} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {formError && <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">{formError}</div>}

              <div>
                <label className="block text-sm font-medium mb-1.5">Group Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Studio IV — Thesis Group"
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What is this group about?"
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {/* Cover photo */}
              <div>
                <label className="block text-sm font-medium mb-2">Cover Photo</label>
                <div className="relative w-full h-28 border-2 border-dashed border-border overflow-hidden" style={{ background: form.coverColor }}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/80">
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-xs font-medium">Click to add a cover photo</span>
                    </div>
                  )}
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    className="absolute inset-0 w-full h-full cursor-pointer" />
                  {coverPreview && (
                    <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(""); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors z-10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Or choose an accent color used when no photo is set:</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {COVER_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, coverColor: c }))}
                      style={{ background: c }}
                      className={`w-7 h-7 rounded-full transition-transform ${form.coverColor === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-110"}`} />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(p => ({ ...p, isPrivate: e.target.checked }))}
                  className="w-4 h-4 accent-primary" />
                <span className="text-sm">Private group (invite only)</span>
              </label>

              {/* Divider */}
              <div className="border-t border-border pt-1">
                <MemberSearchBox
                  invitedMembers={invitedMembers}
                  onAdd={s => setInvitedMembers(p => [...p, { ...s, role: "member" }])}
                  onRemove={id => setInvitedMembers(p => p.filter(m => m.id !== id))}
                  onRoleChange={(id, role) => setInvitedMembers(p => p.map(m => m.id === id ? { ...m, role } : m))}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0 sticky bottom-0 bg-background border-t border-border">
              <button onClick={closeCreate}
                className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={createMut.isPending || coverUploading || !form.name.trim()}
                className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {(createMut.isPending || coverUploading) ? "Creating…" : (
                  <>Create Group {invitedMembers.length > 0 && <span className="bg-white/20 text-xs px-1.5 py-0.5">+{invitedMembers.length}</span>}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">Join Group</h2>
              <button onClick={() => setShowJoinModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Joining <span className="font-semibold text-foreground">{showJoinModal.name}</span>. Choose your role:</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button key={r} onClick={() => setJoinRole(r)}
                    className={`py-2 px-3 text-sm border capitalize transition-colors ${joinRole === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowJoinModal(null)} className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
              <button onClick={() => joinMut.mutate({ id: showJoinModal.id, role: joinRole })} disabled={joinMut.isPending}
                className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {joinMut.isPending ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function GroupCard({ group, mine, onJoin }: { group: Group; mine?: boolean; onJoin?: () => void }) {
  const Icon = CATEGORY_ICONS[group.category] || Globe;
  return (
    <div className="border border-border bg-card hover:border-primary/50 transition-colors flex flex-col overflow-hidden">
      {/* Cover */}
      <div className="relative h-24 flex-shrink-0 overflow-hidden" style={{ background: group.coverColor }}>
        {group.coverImage && (
          <img src={coverSrc(group.coverImage)} alt={group.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-2.5 right-2.5">
          {group.isPrivate
            ? <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-black/40 px-1.5 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Private</span>
            : <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-black/30 px-1.5 py-0.5 rounded-full"><Globe className="w-2.5 h-2.5" /> Public</span>
          }
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground capitalize">{CATEGORY_LABELS[group.category]}</span>
        </div>
        <h3 className="font-semibold text-base mb-1 line-clamp-1">{group.name}</h3>
        {group.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{group.description}</p>}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          </div>
          {mine ? (
            <Link to={`/groups/${group.id}`}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Open <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button onClick={onJoin} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Join <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
