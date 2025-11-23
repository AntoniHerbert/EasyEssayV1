import { type UserMessage, type InsertUserMessage } from "@shared/schema";
import { type Tx } from "../types";

export interface IMessageStore {
  getUserMessages(userId: string, unreadOnly?: boolean): Promise<UserMessage[]>;
  getMessageById(id: string): Promise<UserMessage | undefined>;
  createUserMessage(message: InsertUserMessage, tx?: Tx): Promise<UserMessage>;
  markMessageAsRead(id: string, tx?: Tx): Promise<UserMessage | undefined>;
}