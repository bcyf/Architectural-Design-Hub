import { useEffect, useRef, useState, useCallback } from "react";
import { getStudentToken, getStudentPayload } from "@/lib/student-auth";
import { Mic, MicOff, PhoneOff, Phone, Volume2 } from "lucide-react";

interface Participant {
  studentId: number;
  firstName: string;
  lastName: string;
  muted: boolean;
  speaking?: boolean;
}

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function getCallWsUrl(groupId: number) {
  const token = getStudentToken();
  const isHttps = window.location.protocol === "https:";
  const wsProto = isHttps ? "wss:" : "ws:";
  return `${wsProto}//${window.location.host}/ws/call?groupId=${groupId}&token=${token}`;
}

interface Props {
  groupId: number;
  groupName: string;
}

export default function GroupCall({ groupId, groupName }: Props) {
  const me = getStudentPayload();
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<number, RTCPeerConnection>>(new Map()); // studentId → RTCPeerConnection
  const remoteAudiosRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const speakingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  function cleanupCall() {
    wsRef.current?.close();
    wsRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    for (const pc of pcsRef.current.values()) pc.close();
    pcsRef.current.clear();

    for (const audio of remoteAudiosRef.current.values()) {
      audio.srcObject = null;
      audio.remove();
    }
    remoteAudiosRef.current.clear();

    if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
    speakingTimersRef.current.clear();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    setParticipants([]);
    setInCall(false);
    setMuted(false);
    setError("");
  }

  useEffect(() => () => { cleanupCall(); }, []);

  // ── Speaking detection ───────────────────────────────────────────────────────
  function startSpeakingDetection(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      speakingIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 15;
        setParticipants(prev => prev.map(p =>
          p.studentId === me?.id ? { ...p, speaking } : p
        ));
      }, 150);
    } catch { /* ignore — not critical */ }
  }

  // ── Peer connection factory ─────────────────────────────────────────────────
  function createPeerConnection(targetId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcsRef.current.set(targetId, pc);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Remote audio
    pc.ontrack = (e) => {
      let audio = remoteAudiosRef.current.get(targetId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        document.body.appendChild(audio);
        remoteAudiosRef.current.set(targetId, audio);
      }
      audio.srcObject = e.streams[0];

      // Remote speaking detection via Web Audio
      try {
        const ctx = audioCtxRef.current || new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(e.streams[0]);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setParticipants(prev => prev.map(p =>
            p.studentId === targetId ? { ...p, speaking: avg > 15 } : p
          ));
        }, 150);
      } catch { /* ignore */ }
    };

    // ICE candidates → send via signaling
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "signal",
          to: targetId,
          data: { type: "ice_candidate", candidate: e.candidate },
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
    setJoining(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
      startSpeakingDetection(stream);

      const ws = new WebSocket(getCallWsUrl(groupId));
      wsRef.current = ws;

      ws.onopen = () => {
        setInCall(true);
        setJoining(false);
        // Add myself to local participant list
        setParticipants([{ studentId: me!.id, firstName: me!.firstName, lastName: me!.lastName, muted: false }]);
      };

      ws.onerror = () => {
        setError("Could not connect to the call server.");
        setJoining(false);
        cleanupCall();
      };

      ws.onclose = () => {
        if (inCall) cleanupCall();
      };

      ws.onmessage = async (e) => {
        let msg: any;
        try { msg = JSON.parse(e.data); } catch { return; }

        switch (msg.type) {
          // Server sends us the existing participant list on join
          case "call_participants": {
            const existing: Participant[] = msg.participants;
            setParticipants(prev => {
              const meEntry = prev.find(p => p.studentId === me?.id);
              return [
                ...(meEntry ? [meEntry] : []),
                ...existing,
              ];
            });
            // Initiate offers to all existing participants
            for (const p of existing) {
              const pc = createPeerConnection(p.studentId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({
                type: "signal",
                to: p.studentId,
                data: { type: "offer", sdp: pc.localDescription },
              }));
            }
            break;
          }

          case "call_user_joined": {
            setParticipants(prev => {
              if (prev.find(p => p.studentId === msg.studentId)) return prev;
              return [...prev, { studentId: msg.studentId, firstName: msg.firstName, lastName: msg.lastName, muted: msg.muted }];
            });
            // They will send us an offer; don't create PC yet
            break;
          }

          case "call_user_left": {
            setParticipants(prev => prev.filter(p => p.studentId !== msg.studentId));
            pcsRef.current.get(msg.studentId)?.close();
            pcsRef.current.delete(msg.studentId);
            const audio = remoteAudiosRef.current.get(msg.studentId);
            if (audio) { audio.srcObject = null; audio.remove(); }
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
            if (data.type === "offer") {
              let pc = pcsRef.current.get(from);
              if (!pc) pc = createPeerConnection(from);
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({
                type: "signal",
                to: from,
                data: { type: "answer", sdp: pc.localDescription },
              }));
            } else if (data.type === "answer") {
              const pc = pcsRef.current.get(from);
              if (pc && pc.signalingState !== "stable") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              }
            } else if (data.type === "ice_candidate") {
              const pc = pcsRef.current.get(from);
              try { await pc?.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* ignore */ }
            }
            break;
          }
        }
      };
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Microphone permission denied. Please allow mic access and try again."
        : "Could not access microphone.";
      setError(msg);
      setJoining(false);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }

  // ── Mute toggle ─────────────────────────────────────────────────────────────
  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    const newMuted = !muted;
    track.enabled = !newMuted;
    setMuted(newMuted);
    setParticipants(prev => prev.map(p => p.studentId === me?.id ? { ...p, muted: newMuted } : p));
    wsRef.current?.send(JSON.stringify({ type: "mute_state", muted: newMuted }));
  }

  // ── Leave call ──────────────────────────────────────────────────────────────
  function leaveCall() { cleanupCall(); }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!inCall) {
    return (
      <div className="flex flex-col items-center gap-2">
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
        <button
          onClick={joinCall}
          disabled={joining}
          className="flex items-center gap-1.5 text-xs font-medium border border-green-600/40 text-green-700 bg-green-50 px-3 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-60">
          {joining
            ? <><div className="w-3 h-3 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" /> Joining…</>
            : <><Phone className="w-3.5 h-3.5" /> Join Call</>}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-green-600/30 bg-green-50/50 rounded-sm p-3 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-800">Live Call · {participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
            className={`w-7 h-7 flex items-center justify-center border rounded-full transition-colors ${
              muted
                ? "bg-destructive/10 border-destructive/40 text-destructive hover:bg-destructive/20"
                : "bg-white border-border text-muted-foreground hover:text-foreground"
            }`}>
            {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={leaveCall}
            title="Leave call"
            className="w-7 h-7 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors">
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-2">
        {participants.map(p => {
          const isMe = p.studentId === me?.id;
          return (
            <div key={p.studentId}
              className={`flex items-center gap-1.5 px-2 py-1 bg-white border text-xs transition-all ${
                p.speaking && !p.muted
                  ? "border-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.25)]"
                  : "border-border"
              }`}>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: isMe ? "#16a34a" : "#6366f1" }}>
                {p.firstName[0]}{p.lastName[0]}
              </div>
              <span className="font-medium truncate max-w-[80px]">{isMe ? "You" : p.firstName}</span>
              {p.muted
                ? <MicOff className="w-3 h-3 text-destructive flex-shrink-0" />
                : p.speaking
                  ? <Volume2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                  : <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
