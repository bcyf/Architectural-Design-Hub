import { useState } from "react";
import { Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Users, Lock, Globe, Hash, Palette, Search,
  BookOpen, Layers, MessageSquare, ClipboardList, ArrowRight, X
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

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getStudentToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Request failed"); }
  return res.json();
}

interface Group {
  id: number; name: string; description?: string; category: string;
  isPrivate: boolean; coverColor: string; memberCount: number; isMember: boolean; createdBy: number;
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
  const [formError, setFormError] = useState("");

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => apiFetch("/groups"),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => apiFetch("/groups", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); setShowCreate(false); setForm({ name: "", description: "", category: "general", isPrivate: false, coverColor: "#16a34a" }); },
    onError: (e: any) => setFormError(e.message),
  });

  const joinMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiFetch(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); setShowJoinModal(null); },
  });

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
          <div className="bg-background border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold text-lg">Create Group</h2>
              <button onClick={() => { setShowCreate(false); setFormError(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1.5">Group Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Studio IV — Thesis Group"
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="What is this group about?"
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cover Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COVER_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, coverColor: c }))}
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
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => { setShowCreate(false); setFormError(""); }}
                className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
              <button onClick={() => { setFormError(""); createMut.mutate(form); }} disabled={createMut.isPending || !form.name.trim()}
                className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {createMut.isPending ? "Creating…" : "Create Group"}
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
    <div className="border border-border bg-card hover:border-primary/50 transition-colors flex flex-col">
      <div className="h-2" style={{ background: group.coverColor }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground capitalize">{CATEGORY_LABELS[group.category]}</span>
          </div>
          {group.isPrivate ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
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
