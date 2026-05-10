import { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
  description?: string;
  type?: string;
  youtubeId?: string;
}

export function VideoPlayerModal({ open, onClose, src, title, description, type, youtubeId }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) videoRef.current?.pause();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 bg-zinc-900 border-b border-white/10">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {youtubeId ? "YouTube" : (type || "Video")}
              </p>
              {youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-white/40 hover:text-white/80 transition-colors"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <h2 className="text-white font-display font-bold text-lg leading-tight truncate">{title}</h2>
            {description && (
              <p className="text-white/50 text-xs mt-1 line-clamp-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player */}
        <div className="bg-black">
          {youtubeId ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={title}
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              className="w-full max-h-[70vh] outline-none"
              controlsList="nodownload"
              preload="auto"
            />
          )}
        </div>
      </div>
    </div>
  );
}
