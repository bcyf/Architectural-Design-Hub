import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, ClipboardList, Users, Send, Plus, X, ChevronDown,
  CheckCircle2, Circle, Clock, AlertCircle, Flag, Calendar, Trash2,
  ArrowLeft, Lock, Globe, Pencil, LogOut, UserCheck
} from "lucide-react";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getStudentToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Request failed"); }
  return res.json();
}

type Tab = "chat" | "tasks" | "members";

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-500" },
  review: { label: "In Review", icon: AlertCircle, color: "text-amber-500" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};
const PRIORITY_CONFIG = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-amber-500" },
  high: { label: "High", color: "text-red-500" },
};
const ROLES = ["member", "leader", "co-leader", "designer", "researcher", "reviewer"];
const ROLE_COLORS: Record<string, string> = {
  leader: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "co-leader": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  designer: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  researcher: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  reviewer: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  member: "bg-muted text-muted-foreground border-border",
};

export default function GroupRoom() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const me = getStudentPayload();
  const [tab, setTab] = useState<Tab>("chat");
  const [msgInput, setMsgInput] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "", status: "todo" });
  const [editingTask, setEditingTask] = useState<any>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiFetch(`/groups/${groupId}`),
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: () => apiFetch(`/groups/${groupId}/messages`),
    enabled: !!group?.isMember,
    refetchInterval: 5000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["group-tasks", groupId],
    queryFn: () => apiFetch(`/groups/${groupId}/tasks`),
    enabled: !!group?.isMember,
  });

  useEffect(() => { if (group) setMyRole(group.myRole); }, [group]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = useMutation({
    mutationFn: (content: string) => apiFetch(`/groups/${groupId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => { setMsgInput(""); refetchMessages(); },
  });

  const createTask = useMutation({
    mutationFn: (data: any) => apiFetch(`/groups/${groupId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-tasks", groupId] }); setShowTaskForm(false); setTaskForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "", status: "todo" }); },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: any }) => apiFetch(`/groups/${groupId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-tasks", groupId] }); setEditingTask(null); },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: number) => apiFetch(`/groups/${groupId}/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-tasks", groupId] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: string }) => apiFetch(`/groups/${groupId}/members/${memberId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: (_, vars) => { setMyRole(vars.role); setShowRoleMenu(false); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
  });

  const leaveGroup = useMutation({
    mutationFn: () => apiFetch(`/groups/${groupId}/leave`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); setLocation("/groups"); },
  });

  if (groupLoading) return <PageWrapper><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading…</div></PageWrapper>;
  if (groupError || !group) return <PageWrapper><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Group not found or access denied.</div></PageWrapper>;

  const myMember = group.members?.find((m: any) => m.studentId === me?.id);
  const tasksByStatus = { todo: tasks.filter((t: any) => t.status === "todo"), in_progress: tasks.filter((t: any) => t.status === "in_progress"), review: tasks.filter((t: any) => t.status === "review"), done: tasks.filter((t: any) => t.status === "done") };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back + Header */}
        <div className="mb-6">
          <button onClick={() => setLocation("/groups")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Groups
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: group.coverColor }} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-display font-bold">{group.name}</h1>
                  {group.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                </div>
                {group.description && <p className="text-muted-foreground text-sm mt-0.5">{group.description}</p>}
              </div>
            </div>
            {group.isMember && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {myMember && (
                  <div className="relative">
                    <button onClick={() => setShowRoleMenu(p => !p)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border capitalize ${ROLE_COLORS[myRole || "member"]}`}>
                      <UserCheck className="w-3.5 h-3.5" />
                      {myRole || "member"}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showRoleMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-background border border-border shadow-lg z-20 w-40">
                        {ROLES.map(r => (
                          <button key={r} onClick={() => changeRole.mutate({ memberId: myMember.id, role: r })}
                            className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-muted/50 transition-colors ${myRole === r ? "font-semibold text-primary" : ""}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => { if (confirm("Leave this group?")) leaveGroup.mutate(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors border border-border px-3 py-1.5 hover:border-destructive/50">
                  <LogOut className="w-3.5 h-3.5" /> Leave
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {[{ id: "chat", icon: MessageSquare, label: "Discussion" }, { id: "tasks", icon: ClipboardList, label: `Tasks (${tasks.length})` }, { id: "members", icon: Users, label: `Members (${group.members?.length || 0})` }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* ── CHAT TAB ── */}
        {tab === "chat" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 380px)", minHeight: 400 }}>
            {!group.isMember ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Join the group to participate in the discussion.</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                  {messages.length === 0 && <p className="text-center text-muted-foreground text-sm pt-10">No messages yet. Start the discussion!</p>}
                  {messages.map((msg: any) => {
                    const isMe = msg.studentId === me?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: isMe ? "#16a34a" : "#6366f1" }}>
                          {msg.firstName[0]}{msg.lastName[0]}
                        </div>
                        <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`text-xs text-muted-foreground mb-1 ${isMe ? "text-right" : ""}`}>
                            {msg.firstName} {msg.lastName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground" : "bg-muted border border-border"}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={e => { e.preventDefault(); if (msgInput.trim()) sendMsg.mutate(msgInput); }} className="flex gap-3">
                  <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Write a message…"
                    className="flex-1 border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
                  <button type="submit" disabled={!msgInput.trim() || sendMsg.isPending}
                    className="bg-primary text-primary-foreground px-5 py-3 hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {tab === "tasks" && (
          <div>
            {group.isMember && (
              <div className="flex justify-end mb-5">
                <button onClick={() => setShowTaskForm(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            )}

            {/* Task columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["todo", "in_progress", "review", "done"] as const).map(status => {
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={status} className="bg-muted/30 border border-border p-4 rounded-sm">
                    <div className={`flex items-center gap-2 mb-4 text-sm font-semibold ${cfg.color}`}>
                      <StatusIcon className="w-4 h-4" />{cfg.label}
                      <span className="ml-auto bg-background border border-border text-xs px-2 py-0.5 font-normal text-muted-foreground">{tasksByStatus[status].length}</span>
                    </div>
                    <div className="space-y-3">
                      {tasksByStatus[status].map((task: any) => (
                        <div key={task.id} className="bg-background border border-border p-3 hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium leading-tight">{task.title}</p>
                            {group.isMember && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => setEditingTask(task)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" /></button>
                                <button onClick={() => { if (confirm("Delete task?")) deleteTask.mutate(task.id); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={`text-xs font-medium ${PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color}`}>
                              <Flag className="w-3 h-3 inline mr-0.5" />{PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label}
                            </span>
                            {task.assigneeName && (
                              <span className="text-xs bg-muted border border-border px-2 py-0.5 text-muted-foreground">
                                {task.assigneeName} {task.assigneeLastName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />{task.dueDate}
                              </span>
                            )}
                          </div>
                          {/* Quick status change */}
                          {group.isMember && (
                            <select value={task.status} onChange={e => updateTask.mutate({ taskId: task.id, data: { status: e.target.value } })}
                              className="mt-2 w-full text-xs border border-border bg-background px-2 py-1 focus:outline-none focus:border-primary transition-colors">
                              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">No tasks yet</p>
                <p className="text-xs mt-1">Add tasks to track your group's progress.</p>
              </div>
            )}

            {/* Add Task Modal */}
            {showTaskForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-background border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="font-semibold">Add Task</h2>
                    <button onClick={() => setShowTaskForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Title *</label>
                      <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title"
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Description</label>
                      <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Optional details…"
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Assign To</label>
                        <select value={taskForm.assignedTo} onChange={e => setTaskForm(p => ({ ...p, assignedTo: e.target.value }))}
                          className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                          <option value="">Unassigned</option>
                          {group.members?.map((m: any) => <option key={m.studentId} value={m.studentId}>{m.firstName} {m.lastName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Priority</label>
                        <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                          className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Due Date</label>
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-3 p-6 pt-0">
                    <button onClick={() => setShowTaskForm(false)} className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
                    <button onClick={() => createTask.mutate({ ...taskForm, assignedTo: taskForm.assignedTo ? Number(taskForm.assignedTo) : null })}
                      disabled={createTask.isPending || !taskForm.title.trim()}
                      className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {createTask.isPending ? "Adding…" : "Add Task"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Task Modal */}
            {editingTask && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-background border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="font-semibold">Edit Task</h2>
                    <button onClick={() => setEditingTask(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Title *</label>
                      <input value={editingTask.title} onChange={e => setEditingTask((p: any) => ({ ...p, title: e.target.value }))} className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Description</label>
                      <textarea value={editingTask.description || ""} onChange={e => setEditingTask((p: any) => ({ ...p, description: e.target.value }))} rows={3}
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Status</label>
                        <select value={editingTask.status} onChange={e => setEditingTask((p: any) => ({ ...p, status: e.target.value }))}
                          className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Priority</label>
                        <select value={editingTask.priority} onChange={e => setEditingTask((p: any) => ({ ...p, priority: e.target.value }))}
                          className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Assign To</label>
                      <select value={editingTask.assignedTo ?? ""} onChange={e => setEditingTask((p: any) => ({ ...p, assignedTo: e.target.value || null }))}
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
                        <option value="">Unassigned</option>
                        {group.members?.map((m: any) => <option key={m.studentId} value={m.studentId}>{m.firstName} {m.lastName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Due Date</label>
                      <input type="date" value={editingTask.dueDate || ""} onChange={e => setEditingTask((p: any) => ({ ...p, dueDate: e.target.value }))}
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-3 p-6 pt-0">
                    <button onClick={() => setEditingTask(null)} className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
                    <button onClick={() => updateTask.mutate({ taskId: editingTask.id, data: { title: editingTask.title, description: editingTask.description, status: editingTask.status, priority: editingTask.priority, assignedTo: editingTask.assignedTo ? Number(editingTask.assignedTo) : null, dueDate: editingTask.dueDate || null } })}
                      disabled={updateTask.isPending || !editingTask.title?.trim()}
                      className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {updateTask.isPending ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === "members" && (
          <div className="space-y-3 max-w-2xl">
            {group.members?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-4 border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: m.studentId === me?.id ? "#16a34a" : "#6366f1" }}>
                    {m.firstName[0]}{m.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.firstName} {m.lastName} {m.studentId === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                    <p className="text-xs text-muted-foreground">{m.studentIdCode} · {m.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 border capitalize ${ROLE_COLORS[m.role]}`}>{m.role}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
