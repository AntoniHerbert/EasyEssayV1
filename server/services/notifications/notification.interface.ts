import { type UserMessage } from "@shared/schema";

export interface INotificationService {
  notifyNewMessage(targetUserId: string, message: UserMessage): void;
  notifyFriendRequest(targetUserId: string, requesterName: string): void;
}