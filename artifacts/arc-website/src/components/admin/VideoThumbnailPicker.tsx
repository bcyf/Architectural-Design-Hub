import { useRef, useState, useEffect } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Upload, X, ImageIcon, Loader2, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoThumbnailPickerProps {
  videoUrl: string;
  value: string;
  onChange: (url: string) => void;
}

export function VideoThumbnailPicker({ videoUrl, value, onChange }: VideoThumbnailPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      const url = `/api/storage${response.objectPath}`;
      setPreview(url);
      onChange(url);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = () => {
    if (!videoUrl) return;
    setIsGenerating(true);
    setGenerateError("");

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(2, video.duration * 0.1);
    };

    video.onseeked = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setGenerateError("Could not capture frame.");
            setIsGenerating(false);
            return;
          }
          const file = new File([blob], "thumbnail.png", { type: "image/png" });
          setPreview(URL.createObjectURL(blob));
          setIsGenerating(false);
          await uploadFile(file);
        }, "image/png");
      } catch {
        setGenerateError("Failed to capture thumbnail.");
        setIsGenerating(false);
      }
      video.src = "";
    };

    video.onerror = () => {
      setGenerateError("Could not load video to generate thumbnail.");
      setIsGenerating(false);
    };

    video.src = videoUrl;
  };

  const busy = isUploading || isGenerating;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={busy}
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <img src={preview} alt="Thumbnail preview" className="w-full h-44 object-cover" />
          {busy && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {isGenerating ? "Generating…" : `${progress}% uploading`}
              </span>
            </div>
          )}
          {!busy && (
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-md bg-background/90 border border-border hover:bg-muted transition-colors"
                title="Replace thumbnail"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-md bg-background/90 border border-border text-destructive hover:bg-muted transition-colors"
                title="Remove thumbnail"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full h-40 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {isGenerating ? "Generating thumbnail…" : `${progress}% uploading`}
              </span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-background border border-border group-hover:border-primary/50 transition-colors">
                <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Click to upload thumbnail</p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB</p>
              </div>
            </>
          )}
        </button>
      )}

      {videoUrl && !busy && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          className="w-full gap-2"
        >
          <Clapperboard className="w-4 h-4" />
          Generate thumbnail from video
        </Button>
      )}

      {generateError && (
        <p className="text-xs text-destructive">{generateError}</p>
      )}
    </div>
  );
}
