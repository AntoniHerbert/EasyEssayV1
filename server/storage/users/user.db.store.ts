import { type DrizzleDb } from "../index"; 
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { type User, type InsertUser } from "@shared/schema";
import { IUserStore } from "./user.store";
import { type Tx } from "../types"; 


export class UserDbStore implements IUserStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser, tx?: Tx): Promise<User> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor.insert(schema.users).values(insertUser).returning();
    return result[0];
  }
}