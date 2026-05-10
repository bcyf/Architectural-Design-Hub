import { useState } from "react";
import { getToken } from "@/lib/auth";
import {
  RefreshCw, BookOpen, Video, FileText, Globe, Download,
  CheckCircle2, AlertCircle, Sparkles, Info, ChevronDown, ChevronUp
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

export default function AutoImport() {
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const newCount = previewItems ? previewItems.filter(i => i.isNew).length : 0;
  const existingCount = previewItems ? previewItems.filter(i => !i.isNew).length : 0;

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const data = await adminFetch("/admin/auto-import/preview", { method: "GET" });
      setPreviewItems(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch preview");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const data = await adminFetch("/admin/auto-import", { method: "POST" });
      setResult(data);
      setPreviewItems(null);
    } catch (err: any) {
      setError(err.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const displayItems = previewItems
    ? (showAll ? previewItems : previewItems.slice(0, 12))
    : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Auto-Import Resources</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Automatically discovers and imports free, publicly available architectural books, videos, and guides from the Internet Archive for students to access.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
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
      </div>

      {/* Info card */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Books & PDFs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Public-domain architectural books and texts freely downloadable in PDF, EPUB, and other formats.</p>
          </div>
        </div>
        <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Videos & Lectures</p>
            <p className="text-xs text-muted-foreground mt-0.5">Free architecture documentaries, lectures, and educational videos available for online streaming.</p>
          </div>
        </div>
        <div className="p-5 rounded-lg border border-border bg-card flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Smart Categorisation</p>
            <p className="text-xs text-muted-foreground mt-0.5">Each resource is automatically sorted into the correct architectural discipline in the Research Library.</p>
          </div>
        </div>
      </div>

      {/* Source notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Content Source: </span>
          All resources are sourced from{" "}
          <a href="https://archive.org" target="_blank" rel="noreferrer" className="underline font-medium">Internet Archive</a>,
          a non-profit digital library of free public-domain and Creative Commons licensed content.
          Only truly free, open-access materials are imported — no borrowed or restricted items.
          Duplicate resources are automatically detected and skipped on every run.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Import success result */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-green-200">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Import Complete</p>
              <p className="text-sm text-green-700 mt-0.5">
                {result.imported} resource{result.imported !== 1 ? "s" : ""} imported · {result.skipped} already existed (skipped)
                {result.errors > 0 && ` · ${result.errors} error${result.errors !== 1 ? "s" : ""}`}
              </p>
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

      {/* Preview loading state */}
      {previewing && (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
          <div className="text-center">
            <p className="font-medium">Searching Internet Archive…</p>
            <p className="text-sm mt-1">Querying architecture books, videos, and guides. This may take a few seconds.</p>
          </div>
        </div>
      )}

      {/* Preview results */}
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
            {newCount === 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> All results already in library
              </span>
            )}
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
                  <div className="absolute top-2 right-2 flex gap-1">
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

      {/* Empty initial state */}
      {!previewing && !previewItems && !result && !error && (
        <div className="rounded-lg border border-dashed border-border bg-card p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Globe className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Ready to search</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Click "Preview Results" to see what free architectural resources are available to import. Review them, then confirm the import.
            </p>
          </div>
          <Button variant="outline" onClick={handlePreview} className="mt-2 gap-2">
            <Globe className="w-4 h-4" /> Preview Results
          </Button>
        </div>
      )}
    </div>
  );
}
