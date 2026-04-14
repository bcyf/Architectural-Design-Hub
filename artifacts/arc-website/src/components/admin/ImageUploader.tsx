import { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Upload, X, ImageIcon, Loader2, User } from "lucide-react";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  variant?: "landscape" | "avatar";
  required?: boolean;
}

export function ImageUploader({ value, onChange, variant = "landscape", required = false }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value || "");

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
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    await uploadFile(file);
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isAvatar = variant === "avatar";

  return (
    <div className={isAvatar ? "flex items-center gap-4" : "space-y-3"}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {preview ? (
        isAvatar ? (
          /* Avatar preview */
          <div className="relative shrink-0">
            <img
              src={preview}
              alt="Photo preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
            {!isUploading && (
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded-full bg-primary text-primary-foreground shadow border border-background"
                  title="Replace photo"
                >
                  <Upload className="w-3 h-3" />
                </button>
                {!required && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1 rounded-full bg-destructive text-destructive-foreground shadow border border-background"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Landscape preview */
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={preview}
              alt="Image preview"
              className="w-full h-44 object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm font-medium">{progress}% uploaded</span>
              </div>
            )}
            {!isUploading && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-md bg-background/90 border border-border text-foreground hover:bg-muted transition-colors"
                  title="Replace image"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                {!required && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1.5 rounded-md bg-background/90 border border-border text-destructive hover:bg-muted transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      ) : isAvatar ? (
        /* Avatar placeholder */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted hover:border-primary/50 hover:bg-muted/80 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <User className="w-7 h-7 text-muted-foreground" />
        </button>
      ) : (
        /* Landscape placeholder */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-40 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="p-3 rounded-full bg-background border border-border group-hover:border-primary/50 transition-colors">
            <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Click to upload image</p>
            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB</p>
          </div>
        </button>
      )}

      {/* Upload button label for avatar when no image */}
      {isAvatar && !preview && (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            Upload photo
          </button>
          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  );
}
