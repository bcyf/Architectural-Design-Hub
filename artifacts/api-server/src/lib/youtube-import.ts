import { db, resourcesTable } from "@workspace/db";
import { ARCHITECTURAL_CATEGORIES } from "@workspace/db/schema/resources";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function getKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not configured. Add it in the Secrets tab.");
  return key;
}

// Searches to run — each maps to an architectural category
const SEARCHES: Array<{ q: string; category: string }> = [
  { q: "architecture history documentary lecture",           category: "history-theory" },
  { q: "famous architecture buildings documentary",          category: "history-theory" },
  { q: "MIT architecture lecture OpenCourseWare",            category: "history-theory" },
  { q: "architectural design process studio tutorial",       category: "design-methods" },
  { q: "architectural drawing sketching techniques",         category: "design-methods" },
  { q: "structural engineering architecture buildings",      category: "structures" },
  { q: "building materials construction methods architecture", category: "materials" },
  { q: "BIM Revit architecture tutorial",                    category: "digital-tools" },
  { q: "autocad architectural drafting tutorial",            category: "digital-tools" },
  { q: "professional architect career practice",             category: "professional-practice" },
  { q: "urban design city planning lecture",                 category: "urban-design" },
  { q: "interior architecture space design",                 category: "interior" },
  { q: "sustainable green architecture LEED",                category: "sustainability" },
  { q: "architectural visualization rendering tutorial",     category: "presentation" },
];

interface SearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
}

interface VideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: { high?: { url: string }; medium?: { url: string } };
    tags?: string[];
  };
  statistics: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
}

export interface YouTubePreviewItem {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
  category: string;
  fileUrl: string;
  isNew: boolean;
}

async function searchVideos(q: string, maxResults = 12): Promise<SearchItem[]> {
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", getKey());

  console.log(`[youtube-import] Searching: "${q}"`);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `YouTube search API returned ${res.status}`);
  }
  const data = await res.json();
  return (data.items ?? []) as SearchItem[];
}

async function getVideoDetails(videoIds: string[]): Promise<VideoItem[]> {
  if (videoIds.length === 0) return [];
  const batches: VideoItem[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50).join(",");
    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", ids);
    url.searchParams.set("key", getKey());

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) continue;
    const data = await res.json();
    batches.push(...((data.items ?? []) as VideoItem[]));
  }
  return batches;
}

function cleanText(s: string, max = 400): string {
  return s.replace(/<[^>]*>/g, "").trim().substring(0, max);
}

export async function previewYouTubeImport(): Promise<YouTubePreviewItem[]> {
  // Run all searches in parallel
  const results = await Promise.allSettled(
    SEARCHES.map(s => searchVideos(s.q, 12).then(items => ({ items, category: s.category })))
  );

  // Collect unique video IDs (category = first match wins)
  const videoIdToCategory = new Map<string, string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value.items) {
      const id = item.id?.videoId;
      if (id && !videoIdToCategory.has(id)) {
        videoIdToCategory.set(id, r.value.category);
      }
    }
  }

  const uniqueIds = [...videoIdToCategory.keys()];
  console.log(`[youtube-import] ${uniqueIds.length} unique videos found`);
  if (uniqueIds.length === 0) return [];

  // Fetch full details + statistics
  const details = await getVideoDetails(uniqueIds);

  // Check which are already in the DB
  const existing = await db.select({ fileUrl: resourcesTable.fileUrl }).from(resourcesTable);
  const existingUrls = new Set(existing.map(r => r.fileUrl).filter(Boolean) as string[]);

  const items: YouTubePreviewItem[] = details.map(v => {
    const fileUrl = `https://www.youtube.com/watch?v=${v.id}`;
    const thumb =
      v.snippet.thumbnails.high?.url ??
      v.snippet.thumbnails.medium?.url ??
      `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
    return {
      videoId: v.id,
      title: cleanText(v.snippet.title, 150),
      description: cleanText(v.snippet.description, 400) || "Architecture video from YouTube.",
      channelTitle: v.snippet.channelTitle,
      thumbnailUrl: thumb,
      viewCount: parseInt(v.statistics.viewCount ?? "0", 10) || 0,
      category: videoIdToCategory.get(v.id) ?? "history-theory",
      fileUrl,
      isNew: !existingUrls.has(fileUrl),
    };
  });

  // Sort by view count descending
  return items.sort((a, b) => b.viewCount - a.viewCount);
}

export interface YouTubeImportResult {
  imported: number;
  skipped: number;
  errors: number;
  items: Array<{ title: string; channelTitle: string }>;
}

export async function runYouTubeImport(): Promise<YouTubeImportResult> {
  const all = await previewYouTubeImport();
  const newItems = all.filter(i => i.isNew);
  console.log(`[youtube-import] ${newItems.length} new videos to import`);

  let imported = 0;
  let errors = 0;
  const importedItems: YouTubeImportResult["items"] = [];

  for (const item of newItems) {
    try {
      await db.insert(resourcesTable).values({
        title: item.title,
        description: item.description,
        type: "video",
        fileUrl: item.fileUrl,
        imageUrl: item.thumbnailUrl,
        youtubeId: item.videoId,
        category: item.category,
        tags: `youtube, free, ${item.channelTitle.toLowerCase().replace(/\s+/g, "-")}`,
      });
      imported++;
      importedItems.push({ title: item.title, channelTitle: item.channelTitle });
    } catch (err) {
      console.error("[youtube-import] Insert failed:", item.title, err);
      errors++;
    }
  }

  return { imported, skipped: all.length - newItems.length, errors, items: importedItems };
}
