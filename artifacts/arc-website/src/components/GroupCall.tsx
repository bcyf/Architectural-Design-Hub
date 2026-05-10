import { useEffect, useRef, useState } from "react";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { Mic, MicOff, PhoneOff, Phone, Volume2 } from "lucide-react";

interface Participant {
  studentId: number;
  firstName: string;
  lastName: string;
  muted: boolean;
  speaking?: boolean;
}

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

function getCallWsUrl(groupId: number) {
  const token = getStudentToken();
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/call?groupId=${groupId}&token=${token}`;
}

export default function GroupCall({ groupId, groupName }: { groupId: number; groupName: string }) {
  const me = getStudentPayload();
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // All mutable state kept in refs so closures always see fresh values
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const inCallRef = useRef(false); // mirror of inCall for use inside closures
  const mutedRef = useRef(false);

  useEffect(() => { return () => { doCleanup(); }; }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  function doCleanup() {
    inCallRef.current = false;

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    for (const pc of pcsRef.current.values()) {
      try { pc.close(); } catch { /* ignore */ }
    }
    pcsRef.current.clear();

    for (const audio of remoteAudiosRef.current.values()) {
      audio.srcObject = null;
      audio.pause();
      audio.remove();
    }
    remoteAudiosRef.current.clear();

    setParticipants([]);
    setInCall(false);
    setMuted(false);
    setError("");
  }

  // ── Speaking detection ───────────────────────────────────────────────────────
  function watchSpeaking(stream: MediaStream, studentId: number, setter: (speaking: boolean) => void) {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        if (!inCallRef.current) { clearInterval(interval); ctx.close(); return; }
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setter(avg > 18);
      }, 150);
    } catch { /* not critical */ }
  }

  // ── Peer connection factory ─────────────────────────────────────────────────
  function makePeerConnection(targetId: number): RTCPeerConnection {
    // Close any existing connection to this peer first
    pcsRef.current.get(targetId)?.close();

    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcsRef.current.set(targetId, pc);

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      let audio = remoteAudiosRef.current.get(targetId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        document.body.appendChild(audio);
        remoteAudiosRef.current.set(targetId, audio);
      }
      audio.srcObject = stream;

      watchSpeaking(stream, targetId, (speaking) => {
        setParticipants(prev => prev.map(p => p.studentId === targetId ? { ...p, speaking } : p));
      });
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "signal",
          to: targetId,
          data: { type: "ice_candidate", candidate: e.candidate.toJSON() },
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        pcsRef.current.delete(targetId);
      }
    };

    return pc;
  }

  // ── Join call ───────────────────────────────────────────────────────────────
  async function joinCall() {
    if (joining || inCallRef.current) return;
    setJoining(true);
    setError("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err: any) {
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone permission denied — please allow mic access and try again."
          : "Could not access your microphone."
      );
      setJoining(false);
      return;
    }

    localStreamRef.current = stream;
    watchSpeaking(stream, me!.id, (speaking) => {
      setParticipants(prev => prev.map(p => p.studentId === me?.id ? { ...p, speaking } : p));
    });

    const ws = new WebSocket(getCallWsUrl(groupId));
    wsRef.current = ws;

    ws.onopen = () => {
      inCallRef.current = true;
      setInCall(true);
      setJoining(false);
      setParticipants([{ studentId: me!.id, firstName: me!.firstName, lastName: me!.lastName, muted: false }]);
    };

    ws.onerror = () => {
      setError("Could not connect to the call — please try again.");
      setJoining(false);
      doCleanup();
    };

    ws.onclose = (ev) => {
      // Only auto-cleanup if we're still supposed to be in a call (not a manual leave)
      if (inCallRef.current) {
        inCallRef.current = false;
        setInCall(false);
        setParticipants([]);
        setError("Call disconnected.");
      }
    };

    ws.onmessage = async (e) => {
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!inCallRef.current && msg.type !== "call_participants") return;

      switch (msg.type) {
        case "call_participants": {
          const existing: Participant[] = msg.participants || [];
          setParticipants(prev => {
            const me_ = prev.find(p => p.studentId === me?.id);
            const others = existing.filter(p => p.studentId !== me?.id);
            return me_ ? [me_, ...others] : others;
          });
          // Initiate offers to all existing participants
          for (const p of existing) {
            if (p.studentId === me?.id) continue;
            const pc = makePeerConnection(p.studentId);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "signal", to: p.studentId, data: { type: "offer", sdp: offer } }));
            } catch { /* ignore negotiation errors */ }
          }
          break;
        }

        case "call_user_joined": {
          setParticipants(prev => {
            if (prev.some(p => p.studentId === msg.studentId)) return prev;
            return [...prev, { studentId: msg.studentId, firstName: msg.firstName, lastName: msg.lastName, muted: msg.muted ?? false }];
          });
          break;
        }

        case "call_user_left": {
          setParticipants(prev => prev.filter(p => p.studentId !== msg.studentId));
          pcsRef.current.get(msg.studentId)?.close();
          pcsRef.current.delete(msg.studentId);
          const audio = remoteAudiosRef.current.get(msg.studentId);
          if (audio) { audio.srcObject = null; audio.pause(); audio.remove(); }
          remoteAudiosRef.current.delete(msg.studentId);
          break;
        }

        case "call_mute_changed": {
          setParticipants(prev => prev.map(p =>
            p.studentId === msg.studentId ? { ...p, muted: msg.muted } : p
          ));
          break;
        }

        case "signal": {
          const { from, data } = msg;
          if (!data) return;

          if (data.type === "offer") {
            const pc = makePeerConnection(from);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: "signal", to: from, data: { type: "answer", sdp: answer } }));
            } catch { /* ignore */ }

          } else if (data.type === "answer") {
            const pc = pcsRef.current.get(from);
            if (!pc) return;
            try {
              if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              }
            } catch { /* ignore */ }

          } else if (data.type === "ice_candidate") {
            const pc = pcsRef.current.get(from);
            if (!pc || !data.candidate) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch { /* ignore late candidates */ }
          }
          break;
        }
      }
    };
  }

  // ── Mute toggle ─────────────────────────────────────────────────────────────
  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    const nowMuted = !mutedRef.current;
    mutedRef.current = nowMuted;
    track.enabled = !nowMuted;
    setMuted(nowMuted);
    setParticipants(prev => prev.map(p => p.studentId === me?.id ? { ...p, muted: nowMuted } : p));
    wsRef.current?.send(JSON.stringify({ type: "mute_state", muted: nowMuted }));
  }

  // ── Leave ───────────────────────────────────────────────────────────────────
  function leaveCall() { doCleanup(); }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!inCall) {
    return (
      <div>
        {error && <p className="text-xs text-destructive mb-1.5">{error}</p>}
        <button onClick={joinCall} disabled={joining}
          className="flex items-center gap-1.5 text-xs font-medium border border-green-600/40 text-green-700 bg-green-50 px-3 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-60">
          {joining
            ? <><div className="w-3 h-3 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" /> Joining…</>
            : <><Phone className="w-3.5 h-3.5" /> Join Call</>}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-green-600/30 bg-green-50/50 p-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-800">
            Live Call · {participants.length} participant{participants.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"}
            className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${
              muted ? "bg-destructive/10 border-destructive/40 text-destructive" : "bg-white border-border text-muted-foreground hover:text-foreground"
            }`}>
            {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button onClick={leaveCall} title="Leave call"
            className="w-7 h-7 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors">
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {participants.map(p => {
          const isMe = p.studentId === me?.id;
          return (
            <div key={p.studentId}
              className={`flex items-center gap-1.5 px-2 py-1 bg-white border text-xs transition-all ${
                p.speaking && !p.muted ? "border-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]" : "border-border"
              }`}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: isMe ? "#16a34a" : "#6366f1" }}>
                {p.firstName[0]}{p.lastName[0]}
              </div>
              <span className="font-medium truncate max-w-[80px]">{isMe ? "You" : p.firstName}</span>
              {p.muted
                ? <MicOff className="w-3 h-3 text-destructive flex-shrink-0" />
                : p.speaking
                  ? <Volume2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                  : <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
