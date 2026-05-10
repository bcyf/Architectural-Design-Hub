import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Whiteboard from "@/components/Whiteboard";
import {
  MessageSquare, ClipboardList, Users, Send, Plus, X, ChevronDown,
  CheckCircle2, Circle, Clock, AlertCircle, Flag, Calendar, Trash2,
  ArrowLeft, Lock, Globe, Pencil, LogOut, UserCheck, UserPlus, Search, Check,
  Upload, FileText, FileCheck, Download, ThumbsUp, Paperclip, Eye,
  ImagePlus, FileUp, ZoomIn, PenLine
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

async function uploadFile(file: File): Promise<{ objectPath: string; fileName: string }> {
  const token = getStudentToken();
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const { uploadURL, objectPath } = await urlRes.json();
  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return { objectPath, fileName: file.name };
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

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (["doc", "docx"].includes(ext || "")) return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  return <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

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
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQ, setInviteQ] = useState("");
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTarget, setInviteTarget] = useState<any>(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // Chat attachment state
  const [chatAttach, setChatAttach] = useState<{ file: File; preview: string; type: "image" | "document" } | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submittingFile, setSubmittingFile] = useState(false);
  const submitFileRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inviteDebounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["task-submissions", groupId, viewingTask?.id],
    queryFn: () => apiFetch(`/groups/${groupId}/tasks/${viewingTask.id}/submissions`),
    enabled: !!viewingTask,
  });

  useEffect(() => { if (group) setMyRole(group.myRole); }, [group]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Keep viewingTask in sync with latest tasks data
  useEffect(() => {
    if (viewingTask) {
      const updated = tasks.find((t: any) => t.id === viewingTask.id);
      if (updated) setViewingTask(updated);
    }
  }, [tasks]);

  const sendMsg = useMutation({
    mutationFn: (payload: any) => apiFetch(`/groups/${groupId}/messages`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { setMsgInput(""); setChatAttach(null); refetchMessages(); },
  });

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (chatSending) return;
    const hasText = msgInput.trim().length > 0;
    const hasAttach = !!chatAttach;
    if (!hasText && !hasAttach) return;
    setChatSending(true);
    try {
      let payload: any = {};
      if (hasText) payload.content = msgInput.trim();
      if (hasAttach) {
        const { objectPath, fileName } = await uploadFile(chatAttach.file);
        payload.attachmentName = fileName;
        payload.attachmentPath = objectPath;
        payload.attachmentType = chatAttach.type;
      }
      sendMsg.mutate(payload);
    } catch {
      alert("Failed to upload file. Please try again.");
    } finally {
      setChatSending(false);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatAttach({ file, preview: URL.createObjectURL(file), type: "image" });
    e.target.value = "";
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatAttach({ file, preview: "", type: "document" });
    e.target.value = "";
  }

  function msgAttachSrc(path: string) {
    return `/api/storage/objects${path.replace(/^\/objects/, "")}`;
  }

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

  const inviteMut = useMutation({
    mutationFn: ({ studentId, role }: { studentId: number; role: string }) =>
      apiFetch(`/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify({ studentId, role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      setInviteSuccess(`${inviteTarget?.firstName} ${inviteTarget?.lastName} added to the group!`);
      setInviteTarget(null); setInviteQ(""); setInviteResults([]); setInviteRole("member");
      setTimeout(() => setInviteSuccess(""), 3000);
    },
    onError: (e: any) => setInviteError(e.message),
  });

  const approveSubmission = useMutation({
    mutationFn: ({ taskId, subId }: { taskId: number; subId: number }) =>
      apiFetch(`/groups/${groupId}/tasks/${taskId}/submissions/${subId}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-submissions", groupId, viewingTask?.id] });
      qc.invalidateQueries({ queryKey: ["group-tasks", groupId] });
    },
  });

  function handleInviteSearch(q: string) {
    setInviteQ(q); setInviteError("");
    clearTimeout(inviteDebounceRef.current);
    if (q.length < 2) { setInviteResults([]); return; }
    inviteDebounceRef.current = setTimeout(async () => {
      setInviteLoading(true);
      try {
        const existingIds = new Set((group?.members || []).map((m: any) => m.studentId));
        const data = await apiFetch(`/students/search?q=${encodeURIComponent(q)}`);
        setInviteResults(data.filter((s: any) => !existingIds.has(s.id)));
      } catch { setInviteResults([]); }
      finally { setInviteLoading(false); }
    }, 300);
  }

  async function handleSubmitWork(e: React.FormEvent) {
    e.preventDefault();
    if (!submitFile || !viewingTask) return;
    setSubmittingFile(true);
    try {
      const { objectPath, fileName } = await uploadFile(submitFile);
      await apiFetch(`/groups/${groupId}/tasks/${viewingTask.id}/submissions`, {
        method: "POST",
        body: JSON.stringify({ fileName, objectPath, note: submitNote }),
      });
      qc.invalidateQueries({ queryKey: ["task-submissions", groupId, viewingTask.id] });
      qc.invalidateQueries({ queryKey: ["group-tasks", groupId] });
      setShowSubmitForm(false);
      setSubmitFile(null);
      setSubmitNote("");
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setSubmittingFile(false);
    }
  }

  function openTaskDetail(task: any) {
    setViewingTask(task);
    setShowSubmitForm(false);
    setSubmitFile(null);
    setSubmitNote("");
  }

  if (groupLoading) return <PageWrapper><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading…</div></PageWrapper>;
  if (groupError || !group) return <PageWrapper><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Group not found or access denied.</div></PageWrapper>;

  const myMember = group.members?.find((m: any) => m.studentId === me?.id);
  const isLeader = ["leader", "co-leader"].includes(myRole || "");
  const tasksByStatus = {
    todo: tasks.filter((t: any) => t.status === "todo"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    review: tasks.filter((t: any) => t.status === "review"),
    done: tasks.filter((t: any) => t.status === "done"),
  };

  return (
    <>
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
                <button onClick={() => setShowWhiteboard(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/40 bg-primary/5 px-3 py-1.5 hover:bg-primary/10 transition-colors">
                  <PenLine className="w-3.5 h-3.5" /> Whiteboard
                </button>
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
          {[
            { id: "chat", icon: MessageSquare, label: "Discussion" },
            { id: "tasks", icon: ClipboardList, label: `Tasks (${tasks.length})` },
            { id: "members", icon: Users, label: `Members (${group.members?.length || 0})` },
          ].map(t => (
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
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1">
                  {messages.length === 0 && <p className="text-center text-muted-foreground text-sm pt-10">No messages yet. Start the discussion!</p>}
                  {messages.map((msg: any) => {
                    const isMe = msg.studentId === me?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: isMe ? "#16a34a" : "#6366f1" }}>
                          {msg.firstName[0]}{msg.lastName[0]}
                        </div>
                        <div className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`text-xs text-muted-foreground mb-1 ${isMe ? "text-right" : ""}`}>
                            {msg.firstName} {msg.lastName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>

                          {/* Image attachment */}
                          {msg.attachmentType === "image" && (
                            <button
                              onClick={() => setLightboxSrc(msgAttachSrc(msg.attachmentPath))}
                              className="relative group mb-1 block max-w-xs overflow-hidden border border-border rounded-sm hover:opacity-90 transition-opacity">
                              <img
                                src={msgAttachSrc(msg.attachmentPath)}
                                alt={msg.attachmentName}
                                className="max-w-full max-h-64 object-cover block"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          )}

                          {/* Document attachment */}
                          {msg.attachmentType === "document" && (
                            <a
                              href={msgAttachSrc(msg.attachmentPath)}
                              download={msg.attachmentName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2.5 px-3 py-2.5 mb-1 border hover:bg-muted/60 transition-colors text-sm ${isMe ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}>
                              {fileIcon(msg.attachmentName)}
                              <span className="truncate max-w-[180px] font-medium">{msg.attachmentName}</span>
                              <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </a>
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground" : "bg-muted border border-border"}`}>
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Attachment preview strip */}
                {chatAttach && (
                  <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-muted/50 border border-border">
                    {chatAttach.type === "image" ? (
                      <img src={chatAttach.preview} alt="preview" className="w-12 h-12 object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-background border border-border flex-shrink-0">
                        {fileIcon(chatAttach.file.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chatAttach.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(chatAttach.file.size / 1024).toFixed(0)} KB · {chatAttach.type}</p>
                    </div>
                    <button onClick={() => setChatAttach(null)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Input row */}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                  {/* Photo button */}
                  <button type="button" title="Send photo"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {/* Document button */}
                  <button type="button" title="Send document"
                    onClick={() => docInputRef.current?.click()}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                    <FileUp className="w-4 h-4" />
                  </button>

                  <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                    placeholder={chatAttach ? "Add a caption… (optional)" : "Write a message…"}
                    className="flex-1 border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors h-10" />

                  <button type="submit" disabled={(!msgInput.trim() && !chatAttach) || chatSending}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {chatSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>

                  {/* Hidden file inputs */}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleDocSelect} />
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
                            <button onClick={() => openTaskDetail(task)} className="text-sm font-medium leading-tight text-left hover:text-primary transition-colors flex-1">
                              {task.title}
                            </button>
                            {group.isMember && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => setEditingTask(task)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" /></button>
                                <button onClick={() => { if (confirm("Delete task?")) deleteTask.mutate(task.id); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>}
                          <div className="flex flex-wrap gap-1.5 items-center mb-2">
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

                          {/* Submission count + view button */}
                          <button onClick={() => openTaskDetail(task)}
                            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors border border-dashed border-border hover:border-primary/50 px-2 py-1.5 mt-1">
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {task.submissionCount > 0 ? `${task.submissionCount} submission${task.submissionCount !== 1 ? "s" : ""}` : "No submissions"}
                            </span>
                            <Eye className="w-3 h-3" />
                          </button>

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
                      <input value={editingTask.title} onChange={e => setEditingTask((p: any) => ({ ...p, title: e.target.value }))}
                        className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
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
          <div className="max-w-2xl">
            {group.isMember && (
              <div className="flex justify-end mb-5">
                <button onClick={() => { setShowInvite(true); setInviteError(""); setInviteSuccess(""); setInviteTarget(null); setInviteQ(""); setInviteResults([]); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <UserPlus className="w-4 h-4" /> Invite Member
                </button>
              </div>
            )}
            {inviteSuccess && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-700 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" /> {inviteSuccess}
              </div>
            )}
            <div className="space-y-3">
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
          </div>
        )}

      </div>
    </PageWrapper>

    {/* ── TASK DETAIL / SUBMISSIONS MODAL ── */}
    {viewingTask && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border gap-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-display font-bold text-lg leading-tight">{viewingTask.title}</h2>
                {(() => { const cfg = STATUS_CONFIG[viewingTask.status as keyof typeof STATUS_CONFIG]; const Icon = cfg?.icon; return Icon ? <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon className="w-3.5 h-3.5" />{cfg.label}</span> : null; })()}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {viewingTask.assigneeName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />Assigned to {viewingTask.assigneeName} {viewingTask.assigneeLastName}</span>}
                {viewingTask.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due {viewingTask.dueDate}</span>}
                <span className={`flex items-center gap-1 font-medium ${PRIORITY_CONFIG[viewingTask.priority as keyof typeof PRIORITY_CONFIG]?.color}`}><Flag className="w-3 h-3" />{PRIORITY_CONFIG[viewingTask.priority as keyof typeof PRIORITY_CONFIG]?.label}</span>
              </div>
              {viewingTask.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{viewingTask.description}</p>}
            </div>
            <button onClick={() => { setViewingTask(null); setShowSubmitForm(false); }} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Leader actions */}
            {isLeader && viewingTask.status !== "done" && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20">
                <FileCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 flex-1">As a leader you can approve a submission below to mark this task as complete.</p>
              </div>
            )}
            {viewingTask.status === "done" && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> This task has been marked as complete.
              </div>
            )}

            {/* Submissions list */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                Submitted Work
                {submissions.length > 0 && <span className="text-xs font-normal text-muted-foreground">({submissions.length})</span>}
              </h3>

              {subsLoading ? (
                <p className="text-sm text-muted-foreground">Loading submissions…</p>
              ) : submissions.length === 0 ? (
                <div className="border border-dashed border-border p-6 text-center text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No work submitted yet.</p>
                  <p className="text-xs mt-1">Members can submit PDF or Word documents below.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub: any) => (
                    <div key={sub.id} className={`border p-4 ${sub.isApproved ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {fileIcon(sub.fileName)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sub.fileName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {sub.firstName} {sub.lastName} · {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {sub.note && <p className="text-xs text-foreground/70 mt-1 italic">"{sub.note}"</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sub.isApproved && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-500/10 border border-green-500/30 px-2 py-1">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {isLeader && !sub.isApproved && (
                            <button
                              onClick={() => approveSubmission.mutate({ taskId: viewingTask.id, subId: sub.id })}
                              disabled={approveSubmission.isPending}
                              className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 disabled:opacity-60 transition-colors">
                              <ThumbsUp className="w-3 h-3" />
                              {approveSubmission.isPending ? "…" : "Approve"}
                            </button>
                          )}
                          <a
                            href={`/api/storage/objects${sub.objectPath.replace(/^\/objects/, "")}`}
                            download={sub.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit work form */}
            {group.isMember && !showSubmitForm && (
              <button onClick={() => setShowSubmitForm(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border hover:border-primary/50 py-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Upload className="w-4 h-4" />
                {submissions.length > 0 ? "Submit Updated Work" : "Submit Your Work"}
              </button>
            )}

            {group.isMember && showSubmitForm && (
              <form onSubmit={handleSubmitWork} className="border border-border p-4 space-y-4 bg-muted/20">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Submit Work
                </h4>
                <div>
                  <label className="block text-xs font-medium mb-1.5">File (PDF or Word document) *</label>
                  <div
                    onClick={() => submitFileRef.current?.click()}
                    className="border border-dashed border-border hover:border-primary/50 cursor-pointer p-4 text-center transition-colors">
                    {submitFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        {fileIcon(submitFile.name)}
                        <span className="font-medium truncate max-w-xs">{submitFile.name}</span>
                        <span className="text-muted-foreground">({(submitFile.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Paperclip className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">Click to choose a PDF or Word file</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={submitFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setSubmitFile(f); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Note (optional)</label>
                  <textarea value={submitNote} onChange={e => setSubmitNote(e.target.value)} rows={2}
                    placeholder="Add a note about this submission, what changed, etc."
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowSubmitForm(false); setSubmitFile(null); setSubmitNote(""); }}
                    className="flex-1 border border-border py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!submitFile || submittingFile}
                    className="flex-1 bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {submittingFile ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Submit Work</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── INVITE MODAL ── */}
    {showInvite && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-background border border-border w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="font-semibold text-lg">Invite Member</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Search for a student to add to this group</p>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            {inviteError && <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">{inviteError}</div>}
            {!inviteTarget ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={inviteQ} onChange={e => handleInviteSearch(e.target.value)} autoFocus
                    placeholder="Name, email or student ID…"
                    className="w-full pl-9 pr-4 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary transition-colors" />
                  {inviteLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>}
                </div>
                {inviteResults.length > 0 && (
                  <div className="mt-2 border border-border max-h-52 overflow-y-auto">
                    {inviteResults.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => { setInviteTarget(s); setInviteQ(""); setInviteResults([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border last:border-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                {inviteQ.length >= 2 && !inviteLoading && inviteResults.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground px-1">No students found matching "{inviteQ}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {inviteTarget.firstName[0]}{inviteTarget.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{inviteTarget.firstName} {inviteTarget.lastName}</p>
                    <p className="text-xs text-muted-foreground">{inviteTarget.studentId} · {inviteTarget.email}</p>
                  </div>
                  <button onClick={() => setInviteTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Assign Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button key={r} type="button" onClick={() => setInviteRole(r)}
                        className={`py-2 px-3 text-sm border capitalize transition-colors ${inviteRole === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 p-6 pt-0">
            <button onClick={() => setShowInvite(false)} className="flex-1 border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
            <button onClick={() => { setInviteError(""); inviteMut.mutate({ studentId: inviteTarget.id, role: inviteRole }); }}
              disabled={!inviteTarget || inviteMut.isPending}
              className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              {inviteMut.isPending ? "Adding…" : "Add to Group"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── WHITEBOARD ── */}
    {showWhiteboard && group?.isMember && (
      <Whiteboard groupId={groupId} onClose={() => setShowWhiteboard(false)} />
    )}

    {/* ── LIGHTBOX ── */}
    {lightboxSrc && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightboxSrc(null)}>
        <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" onClick={() => setLightboxSrc(null)}>
          <X className="w-6 h-6" />
        </button>
        <img src={lightboxSrc} alt="Full view" className="max-w-full max-h-[90vh] object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
      </div>
    )}
    </>
  );
}
