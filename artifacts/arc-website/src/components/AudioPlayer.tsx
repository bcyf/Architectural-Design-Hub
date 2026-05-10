import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  src: string;
  isMe?: boolean;
}

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src, isMe }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => { if (!dragging) setCurrent(audio.currentTime); };
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [dragging]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setCurrent(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  const trackColor = isMe
    ? "rgba(255,255,255,0.35)"
    : "rgba(0,0,0,0.12)";
  const fillColor = isMe ? "rgba(255,255,255,0.9)" : "hsl(var(--primary))";

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 min-w-[200px] max-w-[280px] ${
      isMe ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
          isMe
            ? "bg-white/20 hover:bg-white/30"
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        }`}>
        {playing
          ? <Pause className="w-3.5 h-3.5" />
          : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* Progress + time */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Track */}
        <div className="relative h-1.5 rounded-full" style={{ background: trackColor }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: fillColor }}
          />
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={current}
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {/* Time */}
        <div className={`flex justify-between text-[10px] font-mono ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
