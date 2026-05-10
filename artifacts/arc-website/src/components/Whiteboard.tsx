import { useEffect, useRef, useState, useCallback } from "react";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import {
  X, Eraser, Pen, Trash2, Download, Undo2,
  Square, Circle as CircleIcon, Minus as LineIcon, Users, RefreshCw
} from "lucide-react";

interface Point { x: number; y: number; }
interface Stroke {
  id: string;
  tool: string;
  color: string;
  width: number;
  points: Point[];
}
interface LiveStroke {
  tool: string;
  color: string;
  width: number;
  points: Point[];
}

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

const WIDTHS = [2, 4, 8, 16];

function getWsUrl(groupId: number) {
  const token = getStudentToken();
  const isHttps = window.location.protocol === "https:";
  const wsProto = isHttps ? "wss:" : "ws:";
  const host = window.location.host;
  return `${wsProto}//${host}/ws/whiteboard?groupId=${groupId}&token=${token}`;
}

export default function Whiteboard({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const liveStrokesRef = useRef<Map<string, LiveStroke>>(new Map());
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ id: string; points: Point[] } | null>(null);
  const myStrokeIdsRef = useRef<string[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const [tool, setTool] = useState<"pen" | "eraser" | "rect" | "circle" | "line">("pen");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(4);
  const [userCount, setUserCount] = useState(0);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const me = getStudentPayload();

  // ── Canvas helpers ─────────────────────────────────────────────────────────
  function getCtx() { return canvasRef.current?.getContext("2d") ?? null; }
  function getOverlayCtx() { return overlayRef.current?.getContext("2d") ?? null; }

  function redrawAll(strokes: Stroke[]) {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(ctx, s);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

    if (stroke.tool === "pen" || stroke.tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        const prev = stroke.points[i - 1];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
      }
      ctx.stroke();
    } else if (stroke.tool === "rect" && stroke.points.length >= 2) {
      const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    } else if (stroke.tool === "circle" && stroke.points.length >= 2) {
      const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      const rx = Math.abs(p1.x - p0.x) / 2, ry = Math.abs(p1.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(p0.x + (p1.x - p0.x) / 2, p0.y + (p1.y - p0.y) / 2, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (stroke.tool === "line" && stroke.points.length >= 2) {
      const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLiveOverlay() {
    const ctx = getOverlayCtx();
    const canvas = overlayRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const [, s] of liveStrokesRef.current) {
      drawStroke(ctx, { id: "", ...s });
    }
  }

  // ── Canvas size ─────────────────────────────────────────────────────────────
  function resizeCanvas() {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !overlay || !container) return;
    const { width: w, height: h } = container.getBoundingClientRect();
    const img = canvas.toDataURL();
    canvas.width = w; canvas.height = h;
    overlay.width = w; overlay.height = h;
    const ctx = getCtx();
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0);
      image.src = img;
    }
  }

  // ── WebSocket with auto-reconnect ──────────────────────────────────────────
  function connectWs() {
    if (!mountedRef.current) return;
    setStatus("connecting");

    const ws = new WebSocket(getWsUrl(groupId));
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      // Exponential backoff: 1s, 2s, 4s, 8s … max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30_000);
      reconnectAttemptsRef.current++;
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectWs();
      }, delay);
    };

    ws.onerror = () => {
      // onclose fires immediately after onerror — reconnect handled there
    };

    ws.onmessage = (e) => {
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case "history": {
          strokesRef.current = msg.strokes || [];
          redrawAll(strokesRef.current);
          break;
        }
        case "point": {
          const key = msg.strokeId;
          if (msg.first || !liveStrokesRef.current.has(key)) {
            liveStrokesRef.current.set(key, { tool: msg.tool, color: msg.color, width: msg.width, points: [] });
          }
          liveStrokesRef.current.get(key)!.points.push({ x: msg.x, y: msg.y });
          drawLiveOverlay();
          break;
        }
        case "stroke_end": {
          const s = msg.stroke as Stroke;
          if (s) {
            strokesRef.current.push(s);
            redrawAll(strokesRef.current);
            liveStrokesRef.current.delete(s.id);
            drawLiveOverlay();
          }
          break;
        }
        case "clear": {
          strokesRef.current = [];
          liveStrokesRef.current.clear();
          redrawAll([]);
          drawLiveOverlay();
          break;
        }
        case "undo": {
          strokesRef.current = strokesRef.current.filter(s => s.id !== msg.strokeId);
          redrawAll(strokesRef.current);
          break;
        }
        case "users": {
          setUserCount(msg.count);
          break;
        }
      }
    };
  }

  useEffect(() => {
    mountedRef.current = true;
    connectWs();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [groupId]);

  // ── Canvas setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    const container = canvasRef.current?.parentElement;
    if (container) ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Pointer events ─────────────────────────────────────────────────────────
  function getPos(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function sendWs(msg: object) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    const strokeId = `${me?.id ?? 0}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    currentStrokeRef.current = { id: strokeId, points: [pos] };
    myStrokeIdsRef.current.push(strokeId);

    const ctx = getCtx();
    if (ctx && (tool === "pen" || tool === "eraser")) {
      ctx.save();
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    sendWs({ type: "point", strokeId, x: pos.x, y: pos.y, tool, color, width, first: true });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pos = getPos(e);
    const stroke = currentStrokeRef.current;
    stroke.points.push(pos);

    const ctx = getCtx();
    if (ctx && (tool === "pen" || tool === "eraser")) {
      const pts = stroke.points;
      const prev = pts[pts.length - 2];
      ctx.save();
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      const mid = { x: (prev.x + pos.x) / 2, y: (prev.y + pos.y) / 2 };
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
      ctx.stroke();
      ctx.restore();
    } else if (ctx && (tool === "rect" || tool === "circle" || tool === "line")) {
      const overlayCtx = getOverlayCtx();
      const overlayCanvas = overlayRef.current;
      if (overlayCtx && overlayCanvas) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        drawStroke(overlayCtx, { id: "", tool, color, width, points: [stroke.points[0], pos] });
      }
    }
    sendWs({ type: "point", strokeId: stroke.id, x: pos.x, y: pos.y, tool, color, width, first: false });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const pos = getPos(e);
    if (tool === "rect" || tool === "circle" || tool === "line") {
      stroke.points = [stroke.points[0], pos];
    }

    const finalStroke: Stroke = { id: stroke.id, tool, color, width, points: stroke.points };
    strokesRef.current.push(finalStroke);

    const overlayCtx = getOverlayCtx();
    const overlayCanvas = overlayRef.current;
    if (overlayCtx && overlayCanvas) overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (tool === "rect" || tool === "circle" || tool === "line") redrawAll(strokesRef.current);

    sendWs({ type: "stroke_end", stroke: finalStroke });
  }

  function handleClear() {
    if (!confirm("Clear the whiteboard for everyone?")) return;
    strokesRef.current = [];
    redrawAll([]);
    sendWs({ type: "clear" });
  }

  function handleUndo() {
    const myId = myStrokeIdsRef.current.pop();
    if (!myId) return;
    strokesRef.current = strokesRef.current.filter(s => s.id !== myId);
    redrawAll(strokesRef.current);
    sendWs({ type: "undo", strokeId: myId });
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `whiteboard-${Date.now()}.png`;
    a.click();
  }

  const activeTool = "border-primary text-primary bg-primary/10";
  const inactiveTool = "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100" style={{ fontFamily: "inherit" }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border shadow-sm flex-wrap">

        <span className="text-sm font-semibold text-foreground mr-2 hidden sm:block">Whiteboard</span>
        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* Drawing tools */}
        {(["pen", "eraser", "rect", "circle", "line"] as const).map(t => {
          const icons = { pen: Pen, eraser: Eraser, rect: Square, circle: CircleIcon, line: LineIcon };
          const labels = { pen: "Pen", eraser: "Eraser", rect: "Rectangle", circle: "Circle", line: "Line" };
          const Icon = icons[t];
          return (
            <button key={t} title={labels[t]} onClick={() => setTool(t)}
              className={`w-8 h-8 flex items-center justify-center border text-sm transition-colors ${tool === t ? activeTool : inactiveTool}`}>
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button key={c} title={c} onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }}
              className="w-6 h-6 border-2 transition-all flex-shrink-0"
              style={{ background: c, borderColor: color === c ? "#3b82f6" : "#e5e7eb", transform: color === c ? "scale(1.2)" : "scale(1)" }} />
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Width */}
        <div className="flex items-center gap-1">
          {WIDTHS.map(w => (
            <button key={w} title={`${w}px`} onClick={() => setWidth(w)}
              className={`w-8 h-8 flex items-center justify-center border transition-colors ${width === w ? activeTool : inactiveTool}`}>
              <div className="rounded-full bg-current" style={{ width: Math.min(w, 14), height: Math.min(w, 14) }} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Actions */}
        <button onClick={handleUndo} title="Undo" className={`w-8 h-8 flex items-center justify-center border transition-colors ${inactiveTool}`}>
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={handleClear} title="Clear board"
          className="w-8 h-8 flex items-center justify-center border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={handleSave} title="Save as PNG" className={`w-8 h-8 flex items-center justify-center border transition-colors ${inactiveTool}`}>
          <Download className="w-4 h-4" />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${
              status === "connected" ? "bg-green-500"
              : status === "connecting" ? "bg-amber-400 animate-pulse"
              : "bg-red-400"
            }`} />
            <Users className="w-3.5 h-3.5" />
            <span>{userCount}</span>
          </div>
          <button onClick={onClose} title="Close whiteboard"
            className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-white">
        <canvas ref={canvasRef} className="absolute inset-0"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
        <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />

        {/* Status banners */}
        {status === "disconnected" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-500 text-white text-xs px-4 py-2 shadow-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Connection lost — reconnecting…
          </div>
        )}
        {status === "connecting" && reconnectAttemptsRef.current > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-400 text-white text-xs px-4 py-2 shadow-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Reconnecting…
          </div>
        )}
      </div>
    </div>
  );
}
