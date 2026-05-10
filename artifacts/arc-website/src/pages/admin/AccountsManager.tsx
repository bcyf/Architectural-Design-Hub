import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";
import {
  Search, Users, ShieldCheck, ShieldOff, ShieldX, Trash2, RotateCcw,
  AlertTriangle, X, ChevronDown, Users2, MessageSquare, Lock, Globe,
  CheckCircle2, Clock, Ban
} from "lucide-react";

async function adminFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Request failed"); }
  return res.json();
}

type AccountStatus = "active" | "suspended" | "closed";
type GroupStatus = "active" | "suspended" | "closed";

interface Account {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  collegeLevel: string;
  status: AccountStatus;
  isApproved: boolean;
  profilePicture?: string;
  createdAt: string;
  groupCount: number;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  category: string;
  isPrivate: boolean;
  coverColor: string;
  coverImage?: string;
  status: GroupStatus;
  createdBy: number;
  createdAt: string;
  memberCount: number;
  messageCount: number;
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  active:    { label: "Active",    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30", icon: CheckCircle2 },
  suspended: { label: "Suspended", className: "bg-amber-500/10 text-amber-600 border border-amber-500/30",     icon: Clock },
  closed:    { label: "Closed",    className: "bg-red-500/10 text-red-600 border border-red-500/30",             icon: Ban },
};

const CATEGORY_LABELS: Record<string, string> = {
  project: "Project", assignment: "Assignment", general: "General", critique: "Critique", study: "Study",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.active;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function ConfirmDialog({
  open, title, description, confirmLabel, danger,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; description: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg w-full max-w-md mx-4 p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Accounts tab ──────────────────────────────────────────────────────────────

function AccountsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [confirm, setConfirm] = useState<{ type: "suspend" | "close" | "restore" | "delete"; account: Account } | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["admin-accounts"],
    queryFn: () => adminFetch("/admin/accounts"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AccountStatus }) =>
      adminFetch(`/admin/accounts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-accounts"] }); setConfirm(null); },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) => adminFetch(`/admin/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-accounts"] }); setConfirm(null); },
  });

  const active    = accounts.filter(a => a.status === "active").length;
  const suspended = accounts.filter(a => a.status === "suspended").length;
  const closed    = accounts.filter(a => a.status === "closed").length;

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q)
      || a.email.toLowerCase().includes(q) || a.studentId.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleAction(type: "suspend" | "close" | "restore" | "delete", account: Account) {
    setConfirm({ type, account });
  }

  function doConfirm() {
    if (!confirm) return;
    if (confirm.type === "delete") {
      deleteAccount.mutate(confirm.account.id);
    } else {
      const next: AccountStatus = confirm.type === "restore" ? "active" : confirm.type === "suspend" ? "suspended" : "closed";
      updateStatus.mutate({ id: confirm.account.id, status: next });
    }
  }

  const confirmMeta = confirm ? {
    suspend: { title: "Suspend Account", description: `Suspend ${confirm.account.firstName} ${confirm.account.lastName}'s account? They will not be able to log in until restored.`, confirmLabel: "Suspend", danger: false },
    close:   { title: "Close Account",   description: `Close ${confirm.account.firstName} ${confirm.account.lastName}'s account? This marks it as permanently closed.`, confirmLabel: "Close Account", danger: true },
    restore: { title: "Restore Account", description: `Restore ${confirm.account.firstName} ${confirm.account.lastName}'s account to active status?`, confirmLabel: "Restore", danger: false },
    delete:  { title: "Delete Account",  description: `Permanently delete ${confirm.account.firstName} ${confirm.account.lastName}'s account and all their data? This cannot be undone.`, confirmLabel: "Delete Permanently", danger: true },
  }[confirm.type] : null;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Accounts" value={accounts.length} color="text-foreground" />
        <StatCard label="Active"    value={active}    color="text-emerald-600" />
        <StatCard label="Suspended" value={suspended} color="text-amber-600" />
        <StatCard label="Closed"    value={closed}    color="text-red-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, student ID…"
            className="w-full pl-9 pr-4 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "suspended", "closed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading accounts…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          No accounts found.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Groups</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.profilePicture ? (
                        <img src={`/api/storage/objects${a.profilePicture.replace(/^\/objects/, "")}`}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {a.firstName[0]}{a.lastName[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{a.studentId}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{a.collegeLevel}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users2 className="w-3.5 h-3.5" /> {Number(a.groupCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      status={a.status}
                      onSuspend={() => handleAction("suspend", a)}
                      onClose={() => handleAction("close", a)}
                      onRestore={() => handleAction("restore", a)}
                      onDelete={() => handleAction("delete", a)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && confirmMeta && (
        <ConfirmDialog
          open
          title={confirmMeta.title}
          description={confirmMeta.description}
          confirmLabel={confirmMeta.confirmLabel}
          danger={confirmMeta.danger}
          onConfirm={doConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Groups tab ────────────────────────────────────────────────────────────────

function GroupsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GroupStatus>("all");
  const [confirm, setConfirm] = useState<{ type: "suspend" | "close" | "restore" | "delete"; group: Group } | null>(null);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["admin-groups"],
    queryFn: () => adminFetch("/admin/groups-manage"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: GroupStatus }) =>
      adminFetch(`/admin/groups-manage/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-groups"] }); setConfirm(null); },
  });

  const deleteGroup = useMutation({
    mutationFn: (id: number) => adminFetch(`/admin/groups-manage/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-groups"] }); setConfirm(null); },
  });

  const active    = groups.filter(g => g.status === "active").length;
  const suspended = groups.filter(g => g.status === "suspended").length;
  const closed    = groups.filter(g => g.status === "closed").length;

  const filtered = groups.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleAction(type: "suspend" | "close" | "restore" | "delete", group: Group) {
    setConfirm({ type, group });
  }

  function doConfirm() {
    if (!confirm) return;
    if (confirm.type === "delete") {
      deleteGroup.mutate(confirm.group.id);
    } else {
      const next: GroupStatus = confirm.type === "restore" ? "active" : confirm.type === "suspend" ? "suspended" : "closed";
      updateStatus.mutate({ id: confirm.group.id, status: next });
    }
  }

  const confirmMeta = confirm ? {
    suspend: { title: "Suspend Group",   description: `Suspend "${confirm.group.name}"? Members will not be able to access the group until restored.`, confirmLabel: "Suspend", danger: false },
    close:   { title: "Close Group",     description: `Close "${confirm.group.name}"? This archives the group permanently.`, confirmLabel: "Close Group", danger: true },
    restore: { title: "Restore Group",   description: `Restore "${confirm.group.name}" to active status?`, confirmLabel: "Restore", danger: false },
    delete:  { title: "Delete Group",    description: `Permanently delete "${confirm.group.name}" and all its messages, tasks, and data? This cannot be undone.`, confirmLabel: "Delete Permanently", danger: true },
  }[confirm.type] : null;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Groups" value={groups.length} color="text-foreground" />
        <StatCard label="Active"    value={active}    color="text-emerald-600" />
        <StatCard label="Suspended" value={suspended} color="text-amber-600" />
        <StatCard label="Closed"    value={closed}    color="text-red-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by group name or description…"
            className="w-full pl-9 pr-4 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "suspended", "closed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading groups…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          No groups found.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Group</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Members</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Messages</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden" style={{ background: g.coverColor }}>
                        {g.coverImage && (
                          <img src={`/api/storage/objects${g.coverImage.replace(/^\/objects/, "")}`}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} alt="" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{g.name}</p>
                          {g.isPrivate ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Globe className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        {g.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{g.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize text-xs">{CATEGORY_LABELS[g.category] || g.category}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /> {Number(g.memberCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" /> {Number(g.messageCount)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      status={g.status}
                      onSuspend={() => handleAction("suspend", g)}
                      onClose={() => handleAction("close", g)}
                      onRestore={() => handleAction("restore", g)}
                      onDelete={() => handleAction("delete", g)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && confirmMeta && (
        <ConfirmDialog
          open
          title={confirmMeta.title}
          description={confirmMeta.description}
          confirmLabel={confirmMeta.confirmLabel}
          danger={confirmMeta.danger}
          onConfirm={doConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Action dropdown ───────────────────────────────────────────────────────────

function ActionMenu({ status, onSuspend, onClose, onRestore, onDelete }: {
  status: string;
  onSuspend: () => void;
  onClose: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function action(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded hover:bg-muted/50 transition-colors">
        Actions <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-background border border-border rounded-lg shadow-lg py-1 text-sm">
            {status !== "active" && (
              <button onClick={() => action(onRestore)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-emerald-600 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
            )}
            {status !== "suspended" && status !== "closed" && (
              <button onClick={() => action(onSuspend)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-amber-600 transition-colors">
                <ShieldOff className="w-3.5 h-3.5" /> Suspend
              </button>
            )}
            {status !== "closed" && (
              <button onClick={() => action(onClose)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-orange-600 transition-colors">
                <ShieldX className="w-3.5 h-3.5" /> Close
              </button>
            )}
            <div className="border-t border-border my-1" />
            <button onClick={() => action(onDelete)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "accounts" | "groups";

export default function AccountsManager() {
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Accounts &amp; Groups</h1>
            <p className="text-muted-foreground text-sm">Manage student accounts and discussion groups — suspend, close, or permanently delete.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "accounts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <Users className="w-4 h-4" /> Student Accounts
        </button>
        <button
          onClick={() => setTab("groups")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "groups" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <MessageSquare className="w-4 h-4" /> Discussion Groups
        </button>
      </div>

      {tab === "accounts" ? <AccountsTab /> : <GroupsTab />}
    </div>
  );
}
