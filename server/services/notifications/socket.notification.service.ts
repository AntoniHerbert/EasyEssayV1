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

  notifyFriendRequestAccepted(targetUserId: string, accepterName: string): void {
    if (!this.io) return;
    
    this.io.to(targetUserId).emit("friend_request_accepted", {
      message: `${accepterName} accepted your friend request!`,
      accepterName
    });
  }

  notifyFriendRequest(targetUserId: string, requesterName: string): void {
  if (this.io) {
    this.io.to(targetUserId).emit("friend_request", { 
      message: `${requesterName} sent you a friend request!` 
    });
  }
}
}