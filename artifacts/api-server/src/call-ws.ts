import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { groupMembersTable, studentsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

interface CallClient extends WebSocket {
  groupId?: number;
  studentId?: number;
  firstName?: string;
  lastName?: string;
  muted?: boolean;
  alive?: boolean;
}

// groupId → set of connected call clients
const callRooms = new Map<number, Set<CallClient>>();

function getCallRoom(groupId: number): Set<CallClient> {
  if (!callRooms.has(groupId)) callRooms.set(groupId, new Set());
  return callRooms.get(groupId)!;
}

function participantList(room: Set<CallClient>) {
  return Array.from(room).map(c => ({
    studentId: c.studentId,
    firstName: c.firstName,
    lastName: c.lastName,
    muted: c.muted ?? false,
  }));
}

function broadcastToRoom(room: Set<CallClient>, msg: object, except?: CallClient) {
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function sendTo(room: Set<CallClient>, targetStudentId: number, msg: object) {
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client.studentId === targetStudentId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function attachCallWS(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || "", "http://localhost");
    if (!url.pathname.startsWith("/ws/call")) return; // let other handlers deal with it
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: CallClient, req: IncomingMessage) => {
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");
    const groupId = Number(url.searchParams.get("groupId"));

    if (!token || !groupId) { ws.close(4001, "Missing token or groupId"); return; }

    let payload: any;
    try { payload = jwt.verify(token, process.env["JWT_SECRET"] || ""); }
    catch { ws.close(4001, "Invalid token"); return; }

    // Verify membership and get student name
    try {
      const [membership] = await db
        .select({ role: groupMembersTable.role, firstName: studentsTable.firstName, lastName: studentsTable.lastName })
        .from(groupMembersTable)
        .innerJoin(studentsTable, eq(groupMembersTable.studentId, studentsTable.id))
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.studentId, payload.id)));
      if (!membership) { ws.close(4003, "Not a group member"); return; }

      ws.groupId = groupId;
      ws.studentId = payload.id;
      ws.firstName = membership.firstName;
      ws.lastName = membership.lastName;
      ws.muted = false;
      ws.alive = true;
    } catch { ws.close(4500, "DB error"); return; }

    const room = getCallRoom(groupId);
    const existingParticipants = participantList(room); // snapshot before adding

    room.add(ws);

    // Tell new joiner who's already in the call
    ws.send(JSON.stringify({ type: "call_participants", participants: existingParticipants }));

    // Tell everyone else that this user joined
    broadcastToRoom(room, {
      type: "call_user_joined",
      studentId: ws.studentId,
      firstName: ws.firstName,
      lastName: ws.lastName,
      muted: false,
    }, ws);

    ws.on("pong", () => { ws.alive = true; });

    ws.on("message", (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {
        // WebRTC signaling — forward to specific peer
        case "signal": {
          if (!msg.to || !msg.data) return;
          sendTo(room, msg.to, {
            type: "signal",
            from: ws.studentId,
            data: msg.data,
          });
          break;
        }
        // Mute state change — broadcast to all
        case "mute_state": {
          ws.muted = !!msg.muted;
          broadcastToRoom(room, {
            type: "call_mute_changed",
            studentId: ws.studentId,
            muted: ws.muted,
          }, ws);
          break;
        }
      }
    });

    ws.on("close", () => {
      room.delete(ws);
      if (room.size === 0) callRooms.delete(groupId);
      else {
        broadcastToRoom(room, { type: "call_user_left", studentId: ws.studentId });
      }
    });

    ws.on("error", () => { room.delete(ws); });
  });

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws: CallClient) => {
      if (!ws.alive) { ws.terminate(); return; }
      ws.alive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(interval));
}
