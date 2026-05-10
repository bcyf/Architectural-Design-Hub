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
}

/** Fetch Internet Archive metadata and find the best downloadable file URL */
export async function resolveArchiveFileUrl(identifier: string): Promise<{
  url: string;
  contentType: string;
  ext: string;
} | null> {
  try {
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
    const files: ArchiveFile[] = meta.files ?? [];

    // Priority order for PDFs
    const pdfFile = files.find(
      (f) =>
        f.format === "Text PDF" ||
        f.format === "Additional Text PDF" ||
        f.name?.toLowerCase().endsWith(".pdf")
    );
    if (pdfFile) {
      return {
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(pdfFile.name)}`,
        contentType: "application/pdf",
        ext: "pdf",
      };
    }

    // Priority order for videos
    const videoFile = files.find(
      (f) =>
        f.format === "h.264" ||
        f.format === "MPEG4" ||
        f.format === "Ogg Video" ||
        f.name?.toLowerCase().endsWith(".mp4") ||
        f.name?.toLowerCase().endsWith(".ogv")
    );
    if (videoFile) {
      const ext = videoFile.name.split(".").pop() ?? "mp4";
      return {
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(videoFile.name)}`,
        contentType: ext === "ogv" ? "video/ogg" : "video/mp4",
        ext,
      };
    }

    console.warn(`[download] No suitable file found for ${identifier}`);
    return null;
  } catch (err) {
    console.error(`[download] resolveArchiveFileUrl error:`, err);
    return null;
  }
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
    signal: AbortSignal.timeout(120000),
    headers: { "User-Agent": "ASA-FBC-ResourceImporter/1.0" },
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} from ${fileUrl}`);
  if (!res.body) throw new Error("No response body");

  const privateDir = PRIVATE_DIR();
  const objectId = randomUUID();
  const fullPath = `${privateDir}/resources/${objectId}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const gcsFile = bucket.file(objectName);

  // Stream the download directly into GCS
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
          if (done) {
            writeStream.end();
            break;
          }
          sizeBytes += value.byteLength;
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

  return {
    objectPath: `/objects/resources/${objectId}`,
    contentType,
    sizeBytes,
  };
}
