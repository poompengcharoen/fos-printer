import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const setSocketInstance = (socketServer: SocketIOServer) => {
  io = socketServer;
};

export const getSocketInstance = (): SocketIOServer | null => {
  return io;
};
