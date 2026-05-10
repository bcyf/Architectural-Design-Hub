import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Loader2
} from "lucide-react";

interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
  description?: string;
  type?: string;
}

function formatTime(s: number) {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPlayerModal({ open, onClose, src, title, description, type }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimeout.current);
    if (playing) {
      hideTimeout.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") skip(10);
      if (e.key === "ArrowLeft") skip(-10);
      if (e.key === "m") toggleMute();
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, playing]);

  useEffect(() => {
    if (open) {
      setPlaying(false);
      setCurrentTime(0);
      setLoading(true);
      setControlsVisible(true);
    } else {
      videoRef.current?.pause();
      setPlaying(false);
      clearTimeout(hideTimeout.current);
    }
  }, [open, src]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
    showControls();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const skip = (sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
    showControls();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
    v.muted = val === 0;
  };

  if (!open) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl mx-4 bg-black rounded-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        onMouseMove={showControls}
        onMouseLeave={() => playing && setControlsVisible(false)}
      >
        {/* Video */}
        <div className="relative aspect-video bg-black cursor-pointer" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            preload="auto"
            onTimeUpdate={e => {
              const v = e.currentTarget;
              setCurrentTime(v.currentTime);
              if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
            }}
            onLoadedMetadata={e => { setDuration(e.currentTarget.duration); setLoading(false); }}
            onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setControlsVisible(true); clearTimeout(hideTimeout.current); }}
          />

          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-white animate-spin opacity-70" />
            </div>
          )}

          {/* Big play button overlay */}
          {!playing && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/30 flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition-colors">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
        >
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="mx-4 mb-3 mt-6 relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3 px-4 pb-4">
            {/* Skip back */}
            <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors" title="Back 10s">
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors" title={playing ? "Pause" : "Play"}>
              {playing
                ? <Pause className="w-5 h-5 fill-current" />
                : <Play className="w-5 h-5 fill-current ml-0.5" />
              }
            </button>

            {/* Skip forward */}
            <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors" title="Forward 10s">
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time */}
            <span className="text-white/70 text-xs tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {muted || volume === 0
                  ? <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />
                }
              </button>
              <input
                type="range" min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 accent-primary cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors ml-1">
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Top bar: title + close */}
        <div
          className={`absolute top-0 left-0 right-0 flex items-start justify-between p-4 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">{type || "Video"}</p>
            <h2 className="text-white font-display font-bold text-lg leading-tight">{title}</h2>
            {description && <p className="text-white/60 text-xs mt-1 max-w-lg line-clamp-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
