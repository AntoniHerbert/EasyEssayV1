import { Server } from "socket.io";
import { type INotificationService } from "./notification.interface";
import { type UserMessage } from "@shared/schema";

export class SocketNotificationService implements INotificationService {
  private io: Server | null = null;

  public setIo(io: Server) {
    this.io = io;
  }

  notifyNewMessage(targetUserId: string, message: UserMessage): void {
    if (!this.io) {
      console.warn("Socket.io not initialized yet, skipping notification.");
      return;
    }

    this.io.to(targetUserId).emit("new_message", message);
  }
}