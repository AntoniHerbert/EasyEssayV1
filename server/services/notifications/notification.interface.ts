import { type UserMessage } from "@shared/schema";

export interface INotificationService {
  notifyNewMessage(targetUserId: string, message: UserMessage): void;
  notifyFriendRequestAccepted(targetUserId: string, accepterName: string): void;
  notifyFriendRequest(targetUserId: string, requesterName: string): void;
}