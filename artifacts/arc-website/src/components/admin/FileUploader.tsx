import { useRef, useState, useEffect } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Upload, X, FileText, Video, Loader2, File } from "lucide-react";

interface FileUploaderProps {
  value: string;
  onChange: (url: string) => void;
  accept?: "pdf" | "video" | "any";
  label?: string;
}

const ACCEPT_MAP = {
  pdf: "application/pdf",
  video: "video/mp4,video/webm,video/*",
  any: "application/pdf,video/*",
};

function getFileIcon(url: string) {
  if (!url) return <File className="w-6 h-6 text-muted-foreground" />;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf") || lower.includes("pdf")) return <FileText className="w-6 h-6 text-red-500" />;
  if (lower.match(/\.(mp4|webm|mov|avi|mkv)/) || lower.includes("video")) return <Video className="w-6 h-6 text-blue-500" />;
  return <File className="w-6 h-6 text-muted-foreground" />;
}

function getFileName(url: string) {
  if (!url) return "";
  try {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url;
  }
}

export function FileUploader({ value, onChange, accept = "any", label }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState(value || "");

  useEffect(() => {
    setCurrentUrl(value || "");
  }, [value]);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      const url = `/api/storage${response.objectPath}`;
      setCurrentUrl(url);
      onChange(url);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleRemove = () => {
    setCurrentUrl("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MAP[accept]}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/40">
          {getFileIcon(currentUrl)}
          <span className="text-sm text-foreground truncate flex-1">{getFileName(currentUrl)}</span>
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress}%
            </div>
          ) : (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded border border-border hover:bg-muted transition-colors"
                title="Replace file"
              >
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded border border-border hover:bg-muted transition-colors"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-24 border-2 border-dashed border-border rounded-md bg-muted/30 hover:bg-muted hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{progress}% uploaded</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {label || (accept === "pdf" ? "Upload PDF" : accept === "video" ? "Upload Video" : "Upload File")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accept === "pdf" ? "PDF up to 50MB" : accept === "video" ? "MP4, WebM up to 500MB" : "PDF or Video"}
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
