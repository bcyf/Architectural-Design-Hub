import { useState, useEffect, useRef } from "react";
import { getToken } from "@/lib/auth";
import {
  RefreshCw, BookOpen, Video, FileText, Globe, Download,
  CheckCircle2, AlertCircle, Sparkles, Info, ChevronDown, ChevronUp,
  HardDrive, CloudDownload, Loader2, X, Youtube, Eye, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function adminFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const d = await res.json();
        msg = d.error ?? msg;
      } else {
        const t = await res.text();
        if (t.length < 200) msg = t;
      }
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

interface PreviewItem {
  identifier: string; title: string; description: string;
  type: string; category: string | null;
  imageUrl: string; fileUrl: string; isNew: boolean; downloads: number;
}
interface ImportResult {
  imported: number; skipped: number; errors: number;
  items: Array<{ title: string; type: string }>;
}
interface StoredResource {
  id: number; title: string; type: string;
  fileUrl: string | null; storedObjectPath: string | null;
  category: string | null; imageUrl: string | null; tags?: string;
}
interface LiveRow {
  id: number; title: string;
  status: "pending" | "downloading" | "ok" | "error";
  sizeBytes?: number; message?: string;
}
interface YouTubePreviewItem {
  videoId: string; title: string; description: string;
  channelTitle: string; thumbnailUrl: string;
  viewCount: number; category: string; fileUrl: string; isNew: boolean;
}
interface YouTubeImportResult {
  imported: number; skipped: number; errors: number;
  items: Array<{ title: string; channelTitle: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  "history-theory":        "History & Theory",
  "design-methods":        "Design Methods",
  "structures":            "Structures & Engineering",
  "materials":             "Materials & Construction",
  "digital-tools":         "Digital Tools (BIM/CAD)",
  "professional-practice": "Professional Practice",
  "urban-design":          "Urban Design & Planning",
  "interior":              "Interior Architecture",
  "sustainability":        "Sustainability & Environment",
  "presentation":          "Presentation & Visualization",
};

function TypeIcon({ type }: { type: string }) {
  if (type === "video") return <Video className="w-3.5 h-3.5" />;
  if (type === "book") return <BookOpen className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AutoImport() {
  const [tab, setTab] = useState<"import" | "storage" | "youtube">("import");

  // ── Archive Import ──
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // ── Storage ──
  const [storedResources, setStoredResources] = useState<StoredResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [singleResults, setSingleResults] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [storageError, setStorageError] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── YouTube ──
  const [ytPreviewing, setYtPreviewing] = useState(false);
  const [ytImporting, setYtImporting] = useState(false);
  const [ytPreviewItems, setYtPreviewItems] = useState<YouTubePreviewItem[] | null>(null);
  const [ytImportResult, setYtImportResult] = useState<YouTubeImportResult | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytShowAll, setYtShowAll] = useState(false);

  const newCount = previewItems?.filter(i => i.isNew).length ?? 0;
  const existingCount = previewItems?.filter(i => !i.isNew).length ?? 0;
  const storedCount = storedResources.filter(r => r.storedObjectPath).length;
  const pendingCount = storedResources.filter(r => !r.storedObjectPath).length;
  const bulkOkCount = liveRows.filter(r => r.status === "ok").length;
  const bulkFailCount = liveRows.filter(r => r.status === "error").length;
  const ytNewCount = ytPreviewItems?.filter(i => i.isNew).length ?? 0;
  const ytExistingCount = ytPreviewItems?.filter(i => !i.isNew).length ?? 0;

  // ── Archive Import handlers ──
  async function handlePreview() {
    setPreviewing(true); setImportError(null); setImportResult(null);
    try { setPreviewItems(await adminFetch("/admin/auto-import/preview")); }
    catch (e: any) { setImportError(e.message); }
    finally { setPreviewing(false); }
  }
  async function handleImport() {
    setImporting(true); setImportError(null);
    try { setImportResult(await adminFetch("/admin/auto-import", { method: "POST" })); setPreviewItems(null); }
    catch (e: any) { setImportError(e.message); }
    finally { setImporting(false); }
  }

  // ── Storage handlers ──
  async function loadStoredResources() {
    setLoadingResources(true); setStorageError(null);
    try {
      const data: StoredResource[] = await adminFetch("/resources");
      setStoredResources(data.filter((r: any) => r.tags?.includes("internet-archive")));
    } catch (e: any) { setStorageError(e.message); }
    finally { setLoadingResources(false); }
  }
  async function downloadOne(id: number) {
    setDownloadingId(id);
    setSingleResults(prev => ({ ...prev, [id]: { ok: false, msg: "" } }));
    try {
      const data = await adminFetch(`/admin/resources/${id}/download-to-storage`, { method: "POST" });
      setSingleResults(prev => ({ ...prev, [id]: { ok: true, msg: `Saved (${formatBytes(data.sizeBytes)})` } }));
      setStoredResources(prev => prev.map(r => r.id === id ? { ...r, storedObjectPath: data.objectPath } : r));
    } catch (e: any) {
      setSingleResults(prev => ({ ...prev, [id]: { ok: false, msg: e.message ?? "Failed" } }));
    } finally { setDownloadingId(null); }
  }
  async function downloadAll() {
    const token = getToken();
    const ac = new AbortController();
    abortRef.current = ac;
    setBulkRunning(true); setBulkDone(false); setBulkError(null);
    setBulkTotal(0); setBulkProgress(0); setLiveRows([]);
    try {
      const res = await fetch("/api/admin/resources/download-all-to-storage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(text.length < 200 ? text : `Server error (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const processLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "start") {
            setBulkTotal(evt.total);
            setLiveRows(storedResources.filter(r => !r.storedObjectPath).map(r => ({ id: r.id, title: r.title, status: "pending" as const })));
          } else if (evt.type === "progress") {
            setBulkProgress(evt.current);
            setLiveRows(prev => prev.map(r => r.id === evt.id ? { ...r, status: "downloading" as const } : r));
          } else if (evt.type === "result") {
            setLiveRows(prev => prev.map(r =>
              r.id === evt.id ? { ...r, status: evt.status === "ok" ? "ok" as const : "error" as const, sizeBytes: evt.sizeBytes, message: evt.message } : r
            ));
            if (evt.status === "ok") {
              setStoredResources(prev => prev.map(r => r.id === evt.id ? { ...r, storedObjectPath: evt.objectPath } : r));
            }
          } else if (evt.type === "complete") {
            setBulkProgress(evt.total); setBulkDone(true);
          } else if (evt.type === "error") {
            setBulkError(evt.message ?? "Bulk download failed");
          }
        } catch {}
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) for (const line of chunk.split("\n")) processLine(line);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setBulkError(e.message ?? "Connection lost");
    } finally {
      setBulkRunning(false);
      abortRef.current = null;
    }
  }

  // ── YouTube handlers ──
  async function handleYtPreview() {
    setYtPreviewing(true); setYtError(null); setYtImportResult(null);
    try { setYtPreviewItems(await adminFetch("/admin/youtube-import/preview")); }
    catch (e: any) { setYtError(e.message); }
    finally { setYtPreviewing(false); }
  }
  async function handleYtImport() {
    setYtImporting(true); setYtError(null);
    try {
      setYtImportResult(await adminFetch("/admin/youtube-import", { method: "POST" }));
      setYtPreviewItems(null);
    } catch (e: any) { setYtError(e.message); }
    finally { setYtImporting(false); }
  }

  useEffect(() => { if (tab === "storage") loadStoredResources(); }, [tab]);

  const displayItems = previewItems ? (showAll ? previewItems : previewItems.slice(0, 12)) : [];
  const ytDisplayItems = ytPreviewItems ? (ytShowAll ? ytPreviewItems : ytPreviewItems.slice(0, 12)) : [];

  const isApiKeyError = ytError?.includes("YOUTUBE_API_KEY");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Resource Library Management</h1>
        <p className="text-muted-foreground mt-1 max-w-xl">
          Import free resources from Internet Archive, download files to your server, or add architecture videos from YouTube.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {([
          { id: "import",   icon: Globe,    label: "Import from Archive" },
          { id: "storage",  icon: HardDrive, label: "Download to Storage" },
          { id: "youtube",  icon: Youtube,  label: "YouTube Videos" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ ARCHIVE IMPORT TAB ═══════════════ */}
      {tab === "import" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, bg: "bg-blue-100", color: "text-blue-600", title: "Books & PDFs", desc: "Public-domain architectural texts, freely downloadable." },
              { icon: Video, bg: "bg-purple-100", color: "text-purple-600", title: "Videos & Lectures", desc: "Free architecture documentaries and educational videos." },
              { icon: Sparkles, bg: "bg-green-100", color: "text-green-600", title: "Smart Categorisation", desc: "Auto-sorted into architectural disciplines." },
            ].map(({ icon: Icon, bg, color, title, desc }) => (
              <div key={title} className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-4 h-4 ${color}`} /></div>
                <div><p className="font-semibold text-sm">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={previewing || importing} className="gap-2">
              {previewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {previewing ? "Searching…" : "Preview Results"}
            </Button>
            {previewItems && newCount > 0 && (
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {importing ? "Importing…" : `Import ${newCount} New`}
              </Button>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Content Source: </span>
              All resources come from <a href="https://archive.org" target="_blank" rel="noreferrer" className="underline font-medium">Internet Archive</a>, a non-profit digital library. Only free, open-access materials are imported.
              After importing, use the <strong>Download to Storage</strong> tab to save the actual files to your server.
            </p>
          </div>

          {importError && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{importError}</p>
            </div>
          )}

          {importResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Import Complete</p>
                  <p className="text-sm text-green-700 mt-0.5">{importResult.imported} imported · {importResult.skipped} already existed{importResult.errors > 0 ? ` · ${importResult.errors} errors` : ""}</p>
                </div>
              </div>
              {importResult.items.length > 0 && (
                <div className="divide-y divide-green-200 max-h-64 overflow-y-auto">
                  {importResult.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <TypeIcon type={item.type} />
                      <span className="text-sm text-green-800 flex-1 truncate">{item.title}</span>
                      <Badge variant="outline" className="text-[11px] capitalize border-green-300 text-green-700">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {previewing && (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
              <div className="text-center"><p className="font-medium">Searching Internet Archive…</p><p className="text-sm mt-1">This may take a few seconds.</p></div>
            </div>
          )}

          {previewItems && !importing && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-bold text-xl">Preview</h2>
                  <div className="flex gap-2">
                    {newCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{newCount} new</span>}
                    {existingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{existingCount} already imported</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayItems.map((item) => (
                  <div key={item.identifier} className={`rounded-lg border bg-card overflow-hidden flex flex-col ${item.isNew ? "border-border hover:border-primary" : "opacity-50 border-dashed"} transition-colors`}>
                    <div className="relative w-full h-36 bg-muted overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {!item.isNew && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Already in library</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-black/70 text-white capitalize flex items-center gap-1"><TypeIcon type={item.type} /> {item.type}</span>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        {item.category ? <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/20 truncate">{CATEGORY_LABELS[item.category] ?? item.category}</span> : <span />}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Download className="w-3 h-3" />{(item.downloads ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {previewItems.length > 12 && (
                <button onClick={() => setShowAll(p => !p)} className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  {showAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {previewItems.length} results</>}
                </button>
              )}
              {newCount > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleImport} disabled={importing} size="lg" className="gap-2">
                    {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {importing ? "Importing…" : `Import ${newCount} New Resource${newCount !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!previewing && !previewItems && !importResult && !importError && (
            <div className="rounded-lg border border-dashed border-border bg-card p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><Globe className="w-6 h-6 text-muted-foreground" /></div>
              <div><p className="font-semibold">Ready to search</p><p className="text-sm text-muted-foreground mt-1 max-w-sm">Click "Preview Results" to see free architectural resources available to import.</p></div>
              <Button variant="outline" onClick={handlePreview} className="mt-2 gap-2"><Globe className="w-4 h-4" /> Preview Results</Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STORAGE TAB ═══════════════ */}
      {tab === "storage" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold">{storedResources.length}</p><p className="text-xs text-muted-foreground">Total Resources</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-green-600">{storedCount}</p><p className="text-xs text-muted-foreground">Stored on Server</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-amber-600">{pendingCount}</p><p className="text-xs text-muted-foreground">Still on Archive.org</p></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadStoredResources} disabled={loadingResources || bulkRunning} className="gap-2">
                {loadingResources ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
              </Button>
              {pendingCount > 0 && !bulkRunning && (
                <Button onClick={downloadAll} className="gap-2">
                  <CloudDownload className="w-4 h-4" /> Download All {pendingCount} Files
                </Button>
              )}
              {bulkRunning && (
                <Button variant="outline" onClick={() => abortRef.current?.abort()} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
                  <X className="w-4 h-4" /> Stop
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">How it works: </span>
              Each PDF or video is fetched from Internet Archive and saved permanently to your server's cloud storage.
              Once stored, students download directly from your server — completely independent of Internet Archive.
            </p>
          </div>

          {(bulkRunning || bulkDone) && liveRows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-3">
                  {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  <span className="font-medium text-sm">{bulkRunning ? `Downloading… ${bulkProgress} / ${bulkTotal}` : `Done — ${bulkOkCount} saved, ${bulkFailCount} failed`}</span>
                </div>
                {bulkTotal > 0 && <span className="text-xs text-muted-foreground">{Math.round((bulkProgress / bulkTotal) * 100)}%</span>}
              </div>
              {bulkTotal > 0 && (
                <div className="h-1.5 bg-muted w-full">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.round((bulkProgress / bulkTotal) * 100)}%` }} />
                </div>
              )}
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {liveRows.map(row => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-5 flex-shrink-0">
                      {row.status === "downloading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                      {row.status === "ok"          && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                      {row.status === "error"       && <X className="w-3.5 h-3.5 text-red-500" />}
                      {row.status === "pending"     && <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />}
                    </div>
                    <span className="text-sm flex-1 truncate">{row.title}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {row.status === "ok"          && row.sizeBytes ? formatBytes(row.sizeBytes) : ""}
                      {row.status === "error"       && <span className="text-red-500 truncate max-w-[160px] block">{row.message}</span>}
                      {row.status === "downloading" && <span className="text-primary">Saving…</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkError && <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{bulkError}</p></div>}
          {storageError && <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{storageError}</p></div>}

          {loadingResources ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3"><Loader2 className="w-6 h-6 animate-spin" /><span>Loading resources…</span></div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Storage</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {storedResources.map((r, i) => {
                    const isDownloading = downloadingId === r.id;
                    const sr = singleResults[r.id];
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium line-clamp-1">{r.title}</p>
                          {sr && <p className={`text-xs mt-0.5 ${sr.ok ? "text-green-600" : "text-red-500"}`}>{sr.ok ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{sr.msg}</span> : sr.msg}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="flex items-center gap-1 text-muted-foreground capitalize text-xs"><TypeIcon type={r.type} />{r.type}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {r.category ? <span className="text-xs text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/20">{CATEGORY_LABELS[r.category] ?? r.category}</span> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.storedObjectPath
                            ? <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium"><HardDrive className="w-3.5 h-3.5" /> On Server</span>
                            : <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium"><Globe className="w-3.5 h-3.5" /> Archive.org</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.storedObjectPath ? <span className="text-xs text-muted-foreground">Stored</span> : (
                            <Button size="sm" variant="outline" onClick={() => downloadOne(r.id)} disabled={isDownloading || bulkRunning} className="gap-1.5 h-7 text-xs">
                              {isDownloading ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : <><CloudDownload className="w-3 h-3" /> Download</>}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {storedResources.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No resources imported yet. Use the <strong>Import from Archive</strong> tab first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ YOUTUBE TAB ═══════════════ */}
      {tab === "youtube" && (
        <div className="space-y-6">

          {/* Info / API key notice */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border border-red-200 bg-red-50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><Youtube className="w-4 h-4 text-red-600" /></div>
              <div><p className="font-semibold text-sm text-red-900">YouTube Data API</p><p className="text-xs text-red-700 mt-0.5">Searches YouTube for free architecture lectures, documentaries, and tutorials — auto-sorted by category.</p></div>
            </div>
            <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><TrendingUp className="w-4 h-4 text-blue-600" /></div>
              <div><p className="font-semibold text-sm">Sorted by Popularity</p><p className="text-xs text-muted-foreground mt-0.5">Videos are ranked by view count — the best content first. Always embeddable, always free.</p></div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleYtPreview} disabled={ytPreviewing || ytImporting} className="gap-2">
              {ytPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
              {ytPreviewing ? "Searching YouTube…" : "Preview Videos"}
            </Button>
            {ytPreviewItems && ytNewCount > 0 && (
              <Button onClick={handleYtImport} disabled={ytImporting} className="gap-2 bg-red-600 hover:bg-red-700">
                {ytImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                {ytImporting ? "Importing…" : `Import ${ytNewCount} New Videos`}
              </Button>
            )}
          </div>

          {ytError && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${isApiKeyError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">{isApiKeyError ? "API Key Not Configured" : "Error"}</p>
                <p className="text-sm mt-0.5">{ytError}</p>
                {isApiKeyError && (
                  <p className="text-sm mt-2">
                    Add <code className="bg-amber-100 px-1 rounded font-mono">YOUTUBE_API_KEY</code> in the <strong>Secrets</strong> tab (the lock icon in the sidebar), then click "Preview Videos" again.
                  </p>
                )}
              </div>
            </div>
          )}

          {ytImportResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">YouTube Import Complete</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {ytImportResult.imported} video{ytImportResult.imported !== 1 ? "s" : ""} imported · {ytImportResult.skipped} already existed
                    {ytImportResult.errors > 0 ? ` · ${ytImportResult.errors} errors` : ""}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Videos are now live on the Resources page with inline YouTube player.</p>
                </div>
              </div>
              {ytImportResult.items.length > 0 && (
                <div className="divide-y divide-green-200 max-h-64 overflow-y-auto">
                  {ytImportResult.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <Youtube className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-green-800 flex-1 truncate">{item.title}</span>
                      <span className="text-xs text-green-600 flex-shrink-0">{item.channelTitle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {ytPreviewing && (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin opacity-50" />
              <div className="text-center">
                <p className="font-medium">Searching YouTube…</p>
                <p className="text-sm mt-1">Running 14 category searches — takes about 15 seconds.</p>
              </div>
            </div>
          )}

          {ytPreviewItems && !ytImporting && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-bold text-xl">Preview</h2>
                  <div className="flex gap-2">
                    {ytNewCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">{ytNewCount} new</span>}
                    {ytExistingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{ytExistingCount} already imported</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ytDisplayItems.map((item) => (
                  <div key={item.videoId} className={`rounded-lg border bg-card overflow-hidden flex flex-col ${item.isNew ? "border-border hover:border-red-400" : "opacity-50 border-dashed"} transition-colors`}>
                    <div className="relative w-full h-36 bg-muted overflow-hidden">
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {!item.isNew && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Already imported</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube</span>
                      </div>
                      {item.viewCount > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-black/70 text-white flex items-center gap-1"><Eye className="w-3 h-3" /> {formatViews(item.viewCount)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 text-primary/80">{item.channelTitle}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        {item.category ? <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/20 truncate">{CATEGORY_LABELS[item.category] ?? item.category}</span> : <span />}
                        <a href={`https://youtube.com/watch?v=${item.videoId}`} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                          Watch <Globe className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {ytPreviewItems.length > 12 && (
                <button onClick={() => setYtShowAll(p => !p)} className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  {ytShowAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {ytPreviewItems.length} videos</>}
                </button>
              )}

              {ytNewCount > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleYtImport} disabled={ytImporting} size="lg" className="gap-2 bg-red-600 hover:bg-red-700">
                    {ytImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                    {ytImporting ? "Importing…" : `Import ${ytNewCount} Video${ytNewCount !== 1 ? "s" : ""} to Library`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!ytPreviewing && !ytPreviewItems && !ytImportResult && !ytError && (
            <div className="rounded-lg border border-dashed border-border bg-card p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center"><Youtube className="w-6 h-6 text-red-500" /></div>
              <div>
                <p className="font-semibold">Find architecture videos on YouTube</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">Searches 14 architectural categories — lectures, documentaries, tutorials — sorted by popularity.</p>
              </div>
              <Button variant="outline" onClick={handleYtPreview} className="mt-2 gap-2"><Youtube className="w-4 h-4" /> Preview Videos</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
