import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../api";

let socketInstance: Socket | null = null;
const listeners = new Set<(connected: boolean) => void>();
const joinedTicketRooms = new Set<string>();

export function getSocketUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "").replace(/\/api\/?$/, "");
  }

  const apiUrl = API_BASE_URL.trim().replace(/\/+$/, "").replace(/\/api\/?$/, "");
  if (apiUrl) return apiUrl;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      return `http://${hostname}:4001`;
    }
    console.error("[Admin Socket.io] Set VITE_API_BASE_URL or VITE_SOCKET_URL to the admin backend origin.");
    return window.location.origin;
  }
  return "http://localhost:4001";
}

/**
 * Initialize or get active Socket.io instance for Admin Console
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const url = getSocketUrl();
    socketInstance = io(url, {
      transports: ["websocket", "polling"],
      auth: (callback) => callback({
          token:
            typeof localStorage === "undefined"
              ? null
              : localStorage.getItem("triptual_admin_access"),
          role: "ADMIN",
        }),
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log(
        "⚡ [Admin Socket.io] Connected to real-time socket server (ID:",
        socketInstance?.id,
        ")",
      );
      listeners.forEach((cb) => cb(true));
      joinedTicketRooms.forEach((ticketNumber) =>
        socketInstance?.emit("join:ticket", ticketNumber),
      );
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("⚠️ [Admin Socket.io] Disconnected:", reason);
      listeners.forEach((cb) => cb(false));
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("❌ [Admin Socket.io] Connection error:", err.message);
      listeners.forEach((cb) => cb(false));
    });
  }

  return socketInstance;
}

/**
 * Join ticket room for real-time live chat with user
 */
export function joinTicketRoom(ticketNumber: string) {
  const s = getSocket();
  if (ticketNumber) {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.add(clean);
    s.emit("join:ticket", clean);
    console.log("⚡ [Admin Socket.io] Joined room for ticket:", clean);
  }
}

export function joinTicketRooms(ticketNumbers: string[]) {
  const s = getSocket();
  ticketNumbers.filter(Boolean).forEach((ticketNumber) => {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.add(clean);
    s.emit("join:ticket", clean);
  });
}

/**
 * Leave ticket room
 */
export function leaveTicketRoom(ticketNumber: string) {
  const s = getSocket();
  if (ticketNumber) {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.delete(clean);
    s.emit("leave:ticket", clean);
    console.log("⚡ [Admin Socket.io] Left room for ticket:", clean);
  }
}

/**
 * Listen for incoming messages from user or system in active ticket room
 */
export function onTicketMessage(callback: (payload: any) => void) {
  const s = getSocket();
  const handler = (data: any) => {
    callback(data);
  };
  s.on("ticket:message", handler);
  s.on("ticket:new_message", handler);
  return () => {
    s.off("ticket:message", handler);
    s.off("ticket:new_message", handler);
  };
}

export function onTicketCreated(callback: (payload: any) => void) {
  const s = getSocket();
  s.on("ticket:created", callback);
  return () => {
    s.off("ticket:created", callback);
  };
}

/**
 * Listen for real-time ticket status updates
 */
export function onTicketStatusChange(callback: (data: any) => void) {
  const s = getSocket();
  const handler = (data: any) => {
    callback(data);
  };
  s.on("ticket:status_change", handler);
  return () => {
    s.off("ticket:status_change", handler);
  };
}

export function onTicketPresence(
  callback: (data: {
    ticketNumber: string;
    userOnline: boolean;
    clientOnline: boolean;
    adminOnline: boolean;
  }) => void,
) {
  const s = getSocket();
  const handler = (data: any) => callback(data);
  s.on("ticket:presence", handler);
  return () => s.off("ticket:presence", handler);
}

/**
 * Listen for user typing indicator
 */
export function onTicketTyping(
  callback: (data: { ticketNumber: string; isTyping: boolean }) => void,
) {
  const s = getSocket();
  const handler = (data: any) => {
    callback(data);
  };
  s.on("ticket:typing", handler);
  return () => {
    s.off("ticket:typing", handler);
  };
}

/**
 * Broadcast admin typing indicator to user
 */
export function sendAdminTyping(ticketNumber: string, isTyping: boolean) {
  const s = getSocket();
  if (ticketNumber) {
    s.emit("ticket:typing", {
      ticketNumber: String(ticketNumber).trim(),
      isTyping,
      senderRole: "SUPPORT",
    });
  }
}

/**
 * Connection state listener
 */
export function onConnectionChange(callback: (connected: boolean) => void) {
  listeners.add(callback);
  if (socketInstance) {
    callback(socketInstance.connected);
  }
  return () => {
    listeners.delete(callback);
  };
}

export function onSocketReconnect(callback: () => void) {
  const s = getSocket();
  const onConnect = () => callback();
  s.on('connect', onConnect);
  if (s.connected) callback();
  return () => { s.off('connect', onConnect); };
}
