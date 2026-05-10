import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { groupMembersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

interface WsClient extends WebSocket {
  groupId?: number;
  studentId?: number;
  alive?: boolean;
}

interface Stroke {
  id: string;
  tool: string;
  color: string;
  width: number;
  points: [number, number][];
}

// In-memory state: group ID → strokes + connected clients
const rooms = new Map<number, { strokes: Stroke[]; clients: Set<WsClient> }>();

function getRoom(groupId: number) {
  if (!rooms.has(groupId)) rooms.set(groupId, { strokes: [], clients: new Set() });
  return rooms.get(groupId)!;
}

function broadcast(groupId: number, msg: object, except?: WsClient) {
  const room = rooms.get(groupId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const client of room.clients) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastUserCount(groupId: number) {
  const room = rooms.get(groupId);
  if (!room) return;
  broadcast(groupId, { type: "users", count: room.clients.size });
  // Also send to everyone including new joiner
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "users", count: room.clients.size }));
    }
  }
}

export function attachWhiteboardWS(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || "", `http://localhost`);
    if (!url.pathname.startsWith("/ws/whiteboard")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: WsClient, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://localhost`);
    const token = url.searchParams.get("token");
    const groupId = Number(url.searchParams.get("groupId"));

    if (!token || !groupId) {
      ws.close(4001, "Missing token or groupId");
      return;
    }

    // Verify JWT
    let payload: any;
    try {
      payload = jwt.verify(token, process.env["JWT_SECRET"] || "");
    } catch {
      ws.close(4001, "Invalid token");
      return;
    }

    // Check group membership
    try {
      const [member] = await db
        .select()
        .from(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.studentId, payload.id)));
      if (!member) {
        ws.close(4003, "Not a group member");
        return;
      }
    } catch {
      ws.close(4500, "DB error");
      return;
    }

    ws.groupId = groupId;
    ws.studentId = payload.id;
    ws.alive = true;

    const room = getRoom(groupId);
    room.clients.add(ws);

    // Send current board state to new joiner
    ws.send(JSON.stringify({ type: "history", strokes: room.strokes }));
    broadcastUserCount(groupId);

    ws.on("pong", () => { ws.alive = true; });

    ws.on("message", (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {
        case "point": {
          // Live point streaming — broadcast immediately to others
          broadcast(groupId, {
            type: "point",
            strokeId: msg.strokeId,
            x: msg.x,
            y: msg.y,
            tool: msg.tool,
            color: msg.color,
            width: msg.width,
            first: msg.first,
          }, ws);
          break;
        }
        case "stroke_end": {
          // Complete stroke — save in history and broadcast
          if (msg.stroke && typeof msg.stroke === "object") {
            const stroke: Stroke = {
              id: msg.stroke.id,
              tool: msg.stroke.tool || "pen",
              color: msg.stroke.color || "#000",
              width: msg.stroke.width || 3,
              points: msg.stroke.points || [],
            };
            if (stroke.points.length > 0) {
              room.strokes.push(stroke);
              // Keep last 500 strokes
              if (room.strokes.length > 500) room.strokes = room.strokes.slice(-500);
            }
            broadcast(groupId, { type: "stroke_end", stroke }, ws);
          }
          break;
        }
        case "clear": {
          room.strokes = [];
          broadcast(groupId, { type: "clear" }, ws);
          break;
        }
        case "undo": {
          // Remove last stroke by this student
          if (msg.strokeId) {
            room.strokes = room.strokes.filter(s => s.id !== msg.strokeId);
            broadcast(groupId, { type: "undo", strokeId: msg.strokeId }, ws);
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        // Keep strokes for a while in case someone reconnects
        // but remove after 1 hour
        setTimeout(() => {
          if (room.clients.size === 0) rooms.delete(groupId);
        }, 3600_000);
      } else {
        broadcastUserCount(groupId);
      }
    });

    ws.on("error", () => { room.clients.delete(ws); });
  });

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WsClient) => {
      if (!ws.alive) { ws.terminate(); return; }
      ws.alive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(interval));
}
