import { objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";

const PRIVATE_DIR = () => {
  const d = process.env.PRIVATE_OBJECT_DIR;
  if (!d) throw new Error("PRIVATE_OBJECT_DIR not set");
  return d;
};

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

interface ArchiveFile {
  name: string;
  format?: string;
  size?: string;
  private?: string;
}

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB limit per file

function fileSize(f: ArchiveFile): number {
  return parseInt(f.size ?? "0", 10) || 0;
}

function isAccessRestricted(meta: any): boolean {
  if (meta.metadata?.["access-restricted-item"] === "true") return true;
  const col = meta.metadata?.collection;
  const cols: string[] = Array.isArray(col) ? col : col ? [col] : [];
  if (cols.includes("inlibrary")) return true;
  return false;
}

/**
 * Fetch Internet Archive metadata, check for access restrictions,
 * and find the best downloadable file URL.
 *
 * Throws a descriptive error for restricted/oversized items so the
 * caller can surface a meaningful message instead of a bare HTTP status.
 * Returns null when no suitable file exists (item is silently skipped).
 */
export async function resolveArchiveFileUrl(identifier: string): Promise<{
  url: string;
  contentType: string;
  ext: string;
} | null> {
  const metaUrl = `https://archive.org/metadata/${identifier}`;
  console.log(`[download] Fetching metadata: ${metaUrl}`);

  const res = await fetch(metaUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "ASA-FBC-ResourceImporter/1.0" },
  });

  if (!res.ok) {
    console.error(`[download] Metadata fetch failed: ${res.status}`);
    return null;
  }

  const meta = await res.json();

  // Hard stop for lending-library / access-restricted items
  if (isAccessRestricted(meta)) {
    throw new Error(
      "This item is in Internet Archive's lending library and requires borrowing — it cannot be downloaded directly. " +
      "Only public-domain items are freely downloadable."
    );
  }

  const files: ArchiveFile[] = meta.files ?? [];

  // ── PDF candidates ──────────────────────────────────────────────────────────
  const pdfFiles = files.filter(
    (f) =>
      (f.format === "Text PDF" ||
        f.format === "Additional Text PDF" ||
        f.name?.toLowerCase().endsWith(".pdf")) &&
      // Skip files marked private or with access-restricted suffixes
      f.private !== "true" &&
      !f.name?.toLowerCase().includes("_access") &&
      !f.name?.toLowerCase().includes("_restricted")
  );

  // Prefer smallest viable PDF (avoids huge scanned books timing out)
  const sortedPdfs = pdfFiles
    .filter((f) => {
      const s = fileSize(f);
      return s === 0 || s <= MAX_FILE_BYTES;
    })
    .sort((a, b) => fileSize(a) - fileSize(b));

  if (sortedPdfs.length === 0 && pdfFiles.length > 0) {
    // All PDFs exist but are over the size limit
    const smallest = pdfFiles.sort((a, b) => fileSize(a) - fileSize(b))[0];
    const mb = (fileSize(smallest) / 1048576).toFixed(0);
    throw new Error(
      `All PDF files for this item are too large to store (smallest is ${mb} MB). ` +
      `Use the Archive.org link to download manually.`
    );
  }

  if (sortedPdfs.length > 0) {
    const chosen = sortedPdfs[0];
    const mb = fileSize(chosen) > 0 ? ` (${(fileSize(chosen) / 1048576).toFixed(1)} MB)` : "";
    console.log(`[download] Chose PDF: ${chosen.name}${mb}`);
    return {
      url: `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`,
      contentType: "application/pdf",
      ext: "pdf",
    };
  }

  // ── Video candidates ────────────────────────────────────────────────────────
  const videoFiles = files.filter(
    (f) =>
      (f.format === "h.264" ||
        f.format === "MPEG4" ||
        f.format === "512Kb MPEG4" ||
        f.name?.toLowerCase().endsWith(".mp4") ||
        f.name?.toLowerCase().endsWith(".ogv")) &&
      f.private !== "true"
  );

  // Sort by size ascending; skip files over limit
  const sortedVideos = videoFiles
    .filter((f) => {
      const s = fileSize(f);
      return s === 0 || s <= MAX_FILE_BYTES;
    })
    .sort((a, b) => fileSize(a) - fileSize(b));

  if (sortedVideos.length === 0 && videoFiles.length > 0) {
    const smallest = videoFiles.sort((a, b) => fileSize(a) - fileSize(b))[0];
    const mb = (fileSize(smallest) / 1048576).toFixed(0);
    throw new Error(
      `All video files for this item are too large to store (smallest is ${mb} MB). ` +
      `Use the Archive.org link to stream it instead.`
    );
  }

  if (sortedVideos.length > 0) {
    const chosen = sortedVideos[0];
    const ext = chosen.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const mb = fileSize(chosen) > 0 ? ` (${(fileSize(chosen) / 1048576).toFixed(1)} MB)` : "";
    console.log(`[download] Chose video: ${chosen.name}${mb}`);
    return {
      url: `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`,
      contentType: ext === "ogv" ? "video/ogg" : "video/mp4",
      ext,
    };
  }

  console.warn(`[download] No suitable file found for ${identifier}`);
  return null;
}

export interface DownloadResult {
  objectPath: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Download a file from a URL and stream it into GCS object storage.
 * Returns the /objects/... path for serving via the storage route.
 */
export async function downloadUrlToStorage(
  fileUrl: string,
  contentType: string
): Promise<DownloadResult> {
  console.log(`[download] Downloading: ${fileUrl}`);

  const res = await fetch(fileUrl, {
    signal: AbortSignal.timeout(180000), // 3 minutes per file
    headers: { "User-Agent": "ASA-FBC-ResourceImporter/1.0" },
  });

  if (!res.ok) {
    // Give specific, human-readable messages for common IA failure modes
    if (res.status === 403) {
      throw new Error("Access denied (403) — this item requires an Internet Archive account or cannot be downloaded freely.");
    }
    if (res.status === 404) {
      throw new Error("File not found (404) — the file may have been removed from Internet Archive.");
    }
    if (res.status === 503 || res.status === 500) {
      throw new Error(
        `Archive.org returned ${res.status} — this item is likely in the lending library or temporarily unavailable. ` +
        "Try again later or use the Archive.org link directly."
      );
    }
    throw new Error(`Download failed (HTTP ${res.status}) from ${fileUrl}`);
  }

  if (!res.body) throw new Error("No response body from server");

  // Guard against unexpectedly large files (e.g. IA returning HTML error pages)
  const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
  if (contentLength > 0 && contentLength > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large to store (${(contentLength / 1048576).toFixed(0)} MB). Use the Archive.org link directly.`
    );
  }

  // Check content-type — IA sometimes returns HTML error pages with 200 status
  const returnedCt = res.headers.get("content-type") ?? "";
  if (returnedCt.includes("text/html")) {
    throw new Error("Archive.org returned an HTML page instead of a file — item may be access-restricted.");
  }

  const privateDir = PRIVATE_DIR();
  const objectId = randomUUID();
  const fullPath = `${privateDir}/resources/${objectId}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const gcsFile = bucket.file(objectName);

  const writeStream = gcsFile.createWriteStream({
    metadata: { contentType },
    resumable: false,
  });

  const reader = res.body.getReader();
  let sizeBytes = 0;

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);

    async function pump() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { writeStream.end(); break; }
          sizeBytes += value.byteLength;

          // Abort mid-stream if the file turns out to be HTML (error page)
          if (sizeBytes < 4096) {
            const chunk = new TextDecoder().decode(value, { stream: true });
            if (chunk.trimStart().startsWith("<!DOCTYPE") || chunk.trimStart().startsWith("<html")) {
              writeStream.destroy(new Error("Archive.org returned an HTML error page — item may be access-restricted."));
              return;
            }
          }

          if (!writeStream.write(value)) {
            await new Promise<void>((r) => writeStream.once("drain", r));
          }
        }
      } catch (err) {
        writeStream.destroy(err as Error);
        reject(err);
      }
    }
    pump();
  });

  console.log(`[download] Stored ${sizeBytes} bytes → ${fullPath}`);
  return { objectPath: `/objects/resources/${objectId}`, contentType, sizeBytes };
}
