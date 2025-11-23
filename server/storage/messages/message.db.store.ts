import { type DrizzleDb } from "../index";
import * as schema from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { type UserMessage, type InsertUserMessage } from "@shared/schema";
import { IMessageStore } from "./message.store";
import { type Tx } from "../types"; 


export class MessageDbStore implements IMessageStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getUserMessages(userId: string, unreadOnly?: boolean): Promise<UserMessage[]> {
    const conditions = [
      or(
        eq(schema.userMessages.fromUserId, userId),
        eq(schema.userMessages.toUserId, userId)
      )
    ];
    
    if (unreadOnly) {
      conditions.push(eq(schema.userMessages.toUserId, userId));
      conditions.push(eq(schema.userMessages.isRead, false));
    }
    
    const result = await this.db
      .select()
      .from(schema.userMessages)
      .where(and(...conditions))
      .orderBy(desc(schema.userMessages.createdAt));
    return result;
  }

  async getMessageById(id: string): Promise<UserMessage | undefined> {
    const result = await this.db
      .select()
      .from(schema.userMessages)
      .where(eq(schema.userMessages.id, id));
    return result[0];
  }

  async createUserMessage(message: InsertUserMessage, tx?: Tx): Promise<UserMessage> {
    const executor = (tx || this.db) as DrizzleDb;
    const result = await executor.insert(schema.userMessages).values(message).returning();
    return result[0];
  }

  async markMessageAsRead(id: string, tx?: Tx): Promise<UserMessage | undefined> {
    const executor = (tx || this.db) as DrizzleDb;
    const result = await executor
      .update(schema.userMessages)
      .set({ isRead: true })
      .where(eq(schema.userMessages.id, id))
      .returning();
    return result[0];
  }
}