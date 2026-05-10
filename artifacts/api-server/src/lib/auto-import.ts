import { db, resourcesTable } from "@workspace/db";
import { like } from "drizzle-orm";

const ARCHIVE_SEARCH = "https://archive.org/advancedsearch.php";

const CATEGORY_KEYWORDS: [string, string][] = [
  ["architectural history", "history-theory"],
  ["history of architecture", "history-theory"],
  ["history", "history-theory"],
  ["theory", "history-theory"],
  ["design method", "design-methods"],
  ["architectural design", "design-methods"],
  ["drawing", "design-methods"],
  ["structural analysis", "structures"],
  ["structural", "structures"],
  ["structure", "structures"],
  ["engineering", "structures"],
  ["concrete", "structures"],
  ["building material", "materials"],
  ["materials", "materials"],
  ["construction", "materials"],
  ["masonry", "materials"],
  ["bim", "digital-tools"],
  ["revit", "digital-tools"],
  ["autocad", "digital-tools"],
  ["digital", "digital-tools"],
  ["parametric", "digital-tools"],
  ["professional practice", "professional-practice"],
  ["architectural practice", "professional-practice"],
  ["urban design", "urban-design"],
  ["urbanism", "urban-design"],
  ["urban planning", "urban-design"],
  ["city planning", "urban-design"],
  ["landscape", "urban-design"],
  ["interior design", "interior"],
  ["interior architecture", "interior"],
  ["interior", "interior"],
  ["sustainable architecture", "sustainability"],
  ["green building", "sustainability"],
  ["sustainability", "sustainability"],
  ["passive design", "sustainability"],
  ["rendering", "presentation"],
  ["visualization", "presentation"],
  ["presentation", "presentation"],
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

// mediatype MUST be inside the q parameter for IA search API
async function searchArchive(q: string, rows = 25): Promise<ArchiveDoc[]> {
  try {
    const params = [
      `q=${encodeURIComponent(q)}`,
      `fl[]=identifier`,
      `fl[]=title`,
      `fl[]=description`,
      `fl[]=subject`,
      `fl[]=downloads`,
      `rows=${rows}`,
      `sort[]=downloads+desc`,
      `output=json`,
    ].join("&");

    const url = `${ARCHIVE_SEARCH}?${params}`;
    console.log(`[auto-import] Searching: ${url.substring(0, 120)}…`);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": "ASA-FBC-ResourceImporter/1.0" },
    });

    console.log(`[auto-import] HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const docs = data.response?.docs ?? [];
    console.log(`[auto-import] Got ${docs.length} results`);
    return docs as ArchiveDoc[];
  } catch (err) {
    console.error(`[auto-import] Search failed:`, err);
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

function docsToItems(docs: ArchiveDoc[], type: "book" | "video" | "guide"): PreviewItem[] {
  const items: PreviewItem[] = [];
  for (const doc of docs) {
    if (!doc.identifier || !doc.title) continue;
    const title = cleanText(doc.title, 150);
    if (!title) continue;
    const description =
      cleanText(doc.description, 500) ||
      `Free architectural ${type} from Internet Archive.`;
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
  // Each query includes mediatype: inside the q string
  const [bookDocs, videoDocs, guideDocs] = await Promise.all([
    searchArchive(
      'subject:(architecture) AND mediatype:texts AND language:English AND NOT collection:inlibrary',
      30
    ),
    searchArchive(
      '(subject:architecture OR subject:"architectural design" OR title:architecture) AND mediatype:movies AND language:English',
      20
    ),
    searchArchive(
      '(subject:"architectural drawing" OR subject:"urban design" OR subject:"interior design") AND mediatype:texts AND language:English AND NOT collection:inlibrary',
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

  console.log(`[auto-import] Total unique candidates: ${rawItems.length}`);

  if (rawItems.length === 0) return [];

  // Mark duplicates against what's in DB
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

  console.log(`[auto-import] ${newItems.length} new items to insert`);

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
      console.error("[auto-import] Insert failed:", item.title, err);
      errors++;
    }
  }

  return { imported, skipped: allItems.length - newItems.length, errors, items: importedItems };
}
