import { db, resourcesTable } from "@workspace/db";

const ARCHIVE_SEARCH = "https://archive.org/advancedsearch.php";

const CATEGORY_KEYWORDS: [string, string][] = [
  ["history of architecture", "history-theory"],
  ["architectural history", "history-theory"],
  ["history", "history-theory"],
  ["theory", "history-theory"],
  ["philosophy of architecture", "history-theory"],
  ["design method", "design-methods"],
  ["architectural design", "design-methods"],
  ["drawing", "design-methods"],
  ["structural analysis", "structures"],
  ["structural design", "structures"],
  ["structure", "structures"],
  ["engineering", "structures"],
  ["concrete", "structures"],
  ["steel construction", "structures"],
  ["building material", "materials"],
  ["materials", "materials"],
  ["construction", "materials"],
  ["masonry", "materials"],
  ["timber", "materials"],
  ["bim", "digital-tools"],
  ["revit", "digital-tools"],
  ["autocad", "digital-tools"],
  ["digital architecture", "digital-tools"],
  ["parametric", "digital-tools"],
  ["professional practice", "professional-practice"],
  ["architectural practice", "professional-practice"],
  ["building law", "professional-practice"],
  ["urban design", "urban-design"],
  ["urbanism", "urban-design"],
  ["city planning", "urban-design"],
  ["urban planning", "urban-design"],
  ["landscape", "urban-design"],
  ["interior design", "interior"],
  ["interior architecture", "interior"],
  ["interiors", "interior"],
  ["sustainable architecture", "sustainability"],
  ["green building", "sustainability"],
  ["sustainability", "sustainability"],
  ["passive design", "sustainability"],
  ["energy efficiency", "sustainability"],
  ["rendering", "presentation"],
  ["architectural presentation", "presentation"],
  ["visualization", "presentation"],
  ["architectural drawing", "presentation"],
];

function detectCategory(title: string, description: string, subjects: string[]): string | null {
  const text = `${title} ${description} ${subjects.join(" ")}`.toLowerCase();
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
    if (text.includes(keyword)) return category;
  }
  return null;
}

function cleanText(val: unknown, maxLen = 500): string {
  if (!val) return "";
  const raw = Array.isArray(val) ? val[0] : val;
  return String(raw).replace(/<[^>]*>/g, "").trim().substring(0, maxLen);
}

interface ArchiveDoc {
  identifier?: string;
  title?: unknown;
  description?: unknown;
  subject?: unknown;
  downloads?: number;
}

async function searchArchive(query: string, mediatype: "texts" | "movies", rows = 30): Promise<ArchiveDoc[]> {
  try {
    const qs = [
      `q=${encodeURIComponent(query)}`,
      `fl[]=identifier`,
      `fl[]=title`,
      `fl[]=description`,
      `fl[]=subject`,
      `fl[]=downloads`,
      `rows=${rows}`,
      `sort[]=downloads+desc`,
      `output=json`,
      `mediatype=${mediatype}`,
    ].join("&");

    const res = await fetch(`${ARCHIVE_SEARCH}?${qs}`, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "ASA-FBC-ResourceImporter/1.0" },
    });

    if (!res.ok) throw new Error(`Archive API ${res.status}`);
    const data = await res.json();
    return (data.response?.docs ?? []) as ArchiveDoc[];
  } catch (err) {
    console.error(`[auto-import] Archive search failed (${mediatype}):`, err);
    return [];
  }
}

export interface PreviewItem {
  identifier: string;
  title: string;
  description: string;
  type: "book" | "video" | "guide";
  category: string | null;
  imageUrl: string;
  fileUrl: string;
  isNew: boolean;
  downloads: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  items: Array<{ title: string; type: string }>;
}

function docsToItems(docs: ArchiveDoc[], type: "book" | "video"): PreviewItem[] {
  const items: PreviewItem[] = [];
  for (const doc of docs) {
    if (!doc.identifier || !doc.title) continue;
    const title = cleanText(doc.title, 150);
    const description = cleanText(doc.description, 500) || `Free architectural ${type} resource from Internet Archive.`;
    const subjects = Array.isArray(doc.subject)
      ? (doc.subject as string[])
      : doc.subject
      ? [String(doc.subject)]
      : [];
    const fileUrl = `https://archive.org/details/${doc.identifier}`;
    items.push({
      identifier: doc.identifier,
      title,
      description,
      type,
      category: detectCategory(title, description, subjects),
      imageUrl: `https://archive.org/services/img/${doc.identifier}`,
      fileUrl,
      isNew: true,
      downloads: doc.downloads ?? 0,
    });
  }
  return items;
}

export async function previewAutoImport(): Promise<PreviewItem[]> {
  const [bookDocs, videoDocs, guideDocs] = await Promise.all([
    searchArchive(
      'subject:(architecture) AND NOT collection:inlibrary AND language:English AND -subject:"science fiction"',
      "texts",
      30
    ),
    searchArchive(
      '(subject:architecture OR subject:"architectural design") AND language:English',
      "movies",
      20
    ),
    searchArchive(
      'subject:("architectural drawing" OR "architectural design" OR "urban planning") AND mediatype:texts AND NOT collection:inlibrary',
      "texts",
      20
    ),
  ]);

  const seen = new Set<string>();
  const rawItems: PreviewItem[] = [];

  for (const item of [
    ...docsToItems(bookDocs, "book"),
    ...docsToItems(guideDocs, "guide"),
    ...docsToItems(videoDocs, "video"),
  ]) {
    if (!seen.has(item.identifier)) {
      seen.add(item.identifier);
      rawItems.push(item);
    }
  }

  // Mark which ones already exist in DB
  const existing = await db
    .select({ fileUrl: resourcesTable.fileUrl })
    .from(resourcesTable);
  const existingUrls = new Set(existing.map((r) => r.fileUrl).filter(Boolean));

  return rawItems.map((item) => ({
    ...item,
    isNew: !existingUrls.has(item.fileUrl),
  }));
}

export async function runAutoImport(): Promise<ImportResult> {
  const allItems = await previewAutoImport();
  const newItems = allItems.filter((i) => i.isNew);

  let imported = 0;
  let errors = 0;
  const importedItems: ImportResult["items"] = [];

  for (const item of newItems) {
    try {
      await db.insert(resourcesTable).values({
        title: item.title,
        description: item.description,
        type: item.type,
        fileUrl: item.fileUrl,
        imageUrl: item.imageUrl,
        category: item.category ?? undefined,
        tags: "internet-archive, open-access, free",
      });
      imported++;
      importedItems.push({ title: item.title, type: item.type });
    } catch (err) {
      console.error("[auto-import] Failed to insert:", item.title, err);
      errors++;
    }
  }

  return {
    imported,
    skipped: allItems.length - newItems.length,
    errors,
    items: importedItems,
  };
}
