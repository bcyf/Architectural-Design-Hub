import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";
import {
  RefreshCw, BookOpen, Video, FileText, Globe, Download,
  CheckCircle2, AlertCircle, Sparkles, Info, ChevronDown, ChevronUp,
  HardDrive, CloudDownload, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function adminFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Request failed"); }
  return res.json();
}

interface PreviewItem {
  identifier: string;
  title: string;
  description: string;
  type: string;
  category: string | null;
  imageUrl: string;
  fileUrl: string;
  isNew: boolean;
  downloads: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  items: Array<{ title: string; type: string }>;
}

interface StoredResource {
  id: number;
  title: string;
  type: string;
  fileUrl: string | null;
  storedObjectPath: string | null;
  category: string | null;
  imageUrl: string | null;
}

interface BulkDownloadResult {
  total: number;
  downloaded: number;
  failed: number;
  results: Array<{ id: number; title: string; status: string; objectPath?: string }>;
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AutoImport() {
  const [tab, setTab] = useState<"import" | "storage">("import");

  // Import tab state
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Storage tab state
  const [storedResources, setStoredResources] = useState<StoredResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkDownloadResult | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [singleResults, setSingleResults] = useState<Record<number, { ok: boolean; msg: string }>>({});

  const newCount = previewItems ? previewItems.filter(i => i.isNew).length : 0;
  const existingCount = previewItems ? previewItems.filter(i => !i.isNew).length : 0;

  async function handlePreview() {
    setPreviewing(true);
    setImportError(null);
    setResult(null);
    try {
      const data = await adminFetch("/admin/auto-import/preview", { method: "GET" });
      setPreviewItems(data);
    } catch (err: any) {
      setImportError(err.message ?? "Failed to fetch preview");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    try {
      const data = await adminFetch("/admin/auto-import", { method: "POST" });
      setResult(data);
      setPreviewItems(null);
    } catch (err: any) {
      setImportError(err.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function loadStoredResources() {
    setLoadingResources(true);
    setStorageError(null);
    try {
      const data: StoredResource[] = await adminFetch("/resources");
      // Only show internet-archive resources
      setStoredResources(data.filter((r: any) => r.tags?.includes("internet-archive")));
    } catch (err: any) {
      setStorageError(err.message ?? "Failed to load resources");
    } finally {
      setLoadingResources(false);
    }
  }

  async function downloadOne(id: number) {
    setDownloadingId(id);
    setSingleResults(prev => ({ ...prev, [id]: { ok: false, msg: "" } }));
    try {
      const data = await adminFetch(`/admin/resources/${id}/download-to-storage`, { method: "POST" });
      setSingleResults(prev => ({ ...prev, [id]: { ok: true, msg: `Saved (${formatBytes(data.sizeBytes)})` } }));
      setStoredResources(prev => prev.map(r => r.id === id ? { ...r, storedObjectPath: data.objectPath } : r));
    } catch (err: any) {
      setSingleResults(prev => ({ ...prev, [id]: { ok: false, msg: err.message ?? "Failed" } }));
    } finally {
      setDownloadingId(null);
    }
  }

  async function downloadAll() {
    setBulkDownloading(true);
    setBulkResult(null);
    setStorageError(null);
    try {
      const data = await adminFetch("/admin/resources/download-all-to-storage", { method: "POST" });
      setBulkResult(data);
      await loadStoredResources();
    } catch (err: any) {
      setStorageError(err.message ?? "Bulk download failed");
    } finally {
      setBulkDownloading(false);
    }
  }

  useEffect(() => {
    if (tab === "storage") loadStoredResources();
  }, [tab]);

  const displayItems = previewItems
    ? (showAll ? previewItems : previewItems.slice(0, 12))
    : [];

  const storedCount = storedResources.filter(r => r.storedObjectPath).length;
  const pendingCount = storedResources.filter(r => !r.storedObjectPath).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Resource Library Management</h1>
        <p className="text-muted-foreground mt-1 max-w-xl">
          Import free architectural resources from Internet Archive and download the actual PDF and video files directly to your server storage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("import")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "import" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Import from Archive</span>
        </button>
        <button
          onClick={() => setTab("storage")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "storage" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Download to Storage</span>
        </button>
      </div>

      {/* ── Import Tab ── */}
      {tab === "import" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="grid sm:grid-cols-3 gap-4 flex-1">
              <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Books & PDFs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Public-domain architectural texts, freely downloadable.</p>
                </div>
              </div>
              <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Videos & Lectures</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Free architecture documentaries and educational videos.</p>
                </div>
              </div>
              <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Smart Categorisation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Auto-sorted into architectural disciplines.</p>
                </div>
              </div>
            </div>
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
            <div className="text-sm text-amber-800">
              <span className="font-semibold">Content Source: </span>
              All resources are sourced from{" "}
              <a href="https://archive.org" target="_blank" rel="noreferrer" className="underline font-medium">Internet Archive</a>,
              a non-profit digital library. Only free, open-access materials are imported.
              After importing, go to the <strong>Download to Storage</strong> tab to save the actual PDF/video files to your server.
            </div>
          </div>

          {importError && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{importError}</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Import Complete</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {result.imported} imported · {result.skipped} already existed
                    {result.errors > 0 && ` · ${result.errors} errors`}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Now go to <strong>Download to Storage</strong> to save the actual files to your server.</p>
                </div>
              </div>
              {result.items.length > 0 && (
                <div className="divide-y divide-green-200 max-h-64 overflow-y-auto">
                  {result.items.map((item, i) => (
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
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
              <div className="text-center">
                <p className="font-medium">Searching Internet Archive…</p>
                <p className="text-sm mt-1">This may take a few seconds.</p>
              </div>
            </div>
          )}

          {previewItems && !importing && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-bold text-xl">Preview</h2>
                  <div className="flex gap-2">
                    {newCount > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {newCount} new
                      </span>
                    )}
                    {existingCount > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                        {existingCount} already imported
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayItems.map((item) => (
                  <div key={item.identifier}
                    className={`rounded-lg border bg-card overflow-hidden flex flex-col ${item.isNew ? "border-border hover:border-primary" : "opacity-50 border-dashed border-border"} transition-colors`}>
                    <div className="relative w-full h-36 bg-muted overflow-hidden flex-shrink-0">
                      <img src={item.imageUrl} alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {!item.isNew && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Already in library
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-black/70 text-white capitalize flex items-center gap-1">
                          <TypeIcon type={item.type} /> {item.type}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        {item.category ? (
                          <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/20 truncate">
                            {CATEGORY_LABELS[item.category] ?? item.category}
                          </span>
                        ) : <span />}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                          <Download className="w-3 h-3" /> {(item.downloads ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {previewItems.length > 12 && (
                <button onClick={() => setShowAll(p => !p)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors rounded-lg">
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

          {!previewing && !previewItems && !result && !importError && (
            <div className="rounded-lg border border-dashed border-border bg-card p-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Globe className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Ready to search</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Click "Preview Results" to see what free architectural resources are available. Review them, then confirm import.
                </p>
              </div>
              <Button variant="outline" onClick={handlePreview} className="mt-2 gap-2">
                <Globe className="w-4 h-4" /> Preview Results
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Storage Tab ── */}
      {tab === "storage" && (
        <div className="space-y-6">

          {/* Summary + bulk action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{storedResources.length}</p>
                <p className="text-xs text-muted-foreground">Total Resources</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{storedCount}</p>
                <p className="text-xs text-muted-foreground">Stored on Server</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Still on Archive.org</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadStoredResources} disabled={loadingResources} className="gap-2">
                {loadingResources ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
              {pendingCount > 0 && (
                <Button onClick={downloadAll} disabled={bulkDownloading} className="gap-2">
                  {bulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                  {bulkDownloading ? "Downloading…" : `Download All ${pendingCount} Files`}
                </Button>
              )}
            </div>
          </div>

          {/* Bulk download progress note */}
          {bulkDownloading && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800">
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Downloading files to server storage…</p>
                <p className="text-sm">This downloads each PDF and video file directly to your server. It can take several minutes depending on file sizes. Please keep this page open.</p>
              </div>
            </div>
          )}

          {/* Bulk result */}
          {bulkResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800">Bulk Download Complete</p>
              </div>
              <p className="text-sm text-green-700">
                {bulkResult.downloaded} downloaded · {bulkResult.failed} failed · {bulkResult.total} total
              </p>
              {bulkResult.failed > 0 && (
                <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                  {bulkResult.results.filter(r => r.status !== "ok").map(r => (
                    <p key={r.id} className="text-xs text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" /> {r.title} — {r.status}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {storageError && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{storageError}</p>
            </div>
          )}

          {/* How it works notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <span className="font-semibold">How it works: </span>
              Clicking "Download" fetches the actual PDF or video file from Internet Archive and saves it permanently to your server's cloud storage.
              Once stored, students get the file directly from your server — no dependency on Internet Archive.
              The original Internet Archive link is kept as a fallback.
            </div>
          </div>

          {/* Resource list */}
          {loadingResources ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading resources…</span>
            </div>
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
                    const singleResult = singleResults[r.id];
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium line-clamp-1 leading-tight">{r.title}</p>
                          {singleResult && (
                            <p className={`text-xs mt-0.5 ${singleResult.ok ? "text-green-600" : "text-red-500"}`}>
                              {singleResult.ok ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{singleResult.msg}</span> : singleResult.msg}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="flex items-center gap-1 text-muted-foreground capitalize text-xs">
                            <TypeIcon type={r.type} />{r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {r.category ? (
                            <span className="text-xs text-primary bg-primary/8 px-2 py-0.5 rounded border border-primary/20">
                              {CATEGORY_LABELS[r.category] ?? r.category}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.storedObjectPath ? (
                            <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                              <HardDrive className="w-3.5 h-3.5" /> On Server
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                              <Globe className="w-3.5 h-3.5" /> Archive.org
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.storedObjectPath ? (
                            <span className="text-xs text-muted-foreground">Stored</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadOne(r.id)}
                              disabled={isDownloading || bulkDownloading}
                              className="gap-1.5 h-7 text-xs"
                            >
                              {isDownloading
                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Downloading…</>
                                : <><CloudDownload className="w-3 h-3" /> Download</>
                              }
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {storedResources.length === 0 && !loadingResources && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No resources imported yet. Go to the <strong>Import from Archive</strong> tab to import resources first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
