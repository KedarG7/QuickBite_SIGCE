import type { Server as SocketIOServer, Socket as SocketIO } from "socket.io";

type EmitOrderNewPayload = {
  orderId: string;
  token: number;
  status: string;
};

type EmitQueueUpdatePayload = {
  updatedAt: string;
};

let io: SocketIOServer | null = null;

export function attachSocket(server: SocketIOServer) {
  io = server;
}

export const socket = {
  onConnect(s: SocketIO) {
    s.join("public");
  },
  emitOrderNew(payload: EmitOrderNewPayload) {
    io?.to("public").emit("order:new", payload);
  },
  emitQueueUpdate(payload: EmitQueueUpdatePayload) {
    io?.to("public").emit("queue:update", payload);
  }
};
