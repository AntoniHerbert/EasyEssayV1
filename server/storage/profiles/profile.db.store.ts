import { type DrizzleDb } from "../index";
import * as schema from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { type UserProfile, type InsertUserProfile } from "@shared/schema";
import { IProfileStore } from "./profile.store";
import { type Tx } from "../types"; 


export class ProfileDbStore implements IProfileStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getAllUsers(): Promise<schema.UserProfileWithAuth[]> {
    const rows = await this.db
    .select({
      profile: schema.userProfiles,
      authUsername: schema.users.username,
  })
    .from(schema.userProfiles)
    .leftJoin(
      schema.users,
      eq(schema.userProfiles.userId, schema.users.id)
    )
    return rows.map(({ profile, authUsername }) => ({
      ...profile,
      username: authUsername || "Unknown"
    }));
  }

  async getUserProfile(userId: string): Promise<schema.UserProfileWithAuth | undefined> {
    const result = await this.db
      .select({
        profile: schema.userProfiles,
        authUsername: schema.users.username,
      })
      .from(schema.userProfiles)
      .leftJoin(
        schema.users, 
        eq(schema.userProfiles.userId, schema.users.id)
      )
      .where(eq(schema.userProfiles.userId, userId));
const row = result[0];
    if (!row) return undefined;

    return {
      ...row.profile,
      username: row.authUsername || "Unknown"
    };
  }

  async createUserProfile(profile: InsertUserProfile, tx?: Tx): Promise<UserProfile> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor.insert(schema.userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, updates: Partial<InsertUserProfile>, tx?: Tx): Promise<UserProfile | undefined> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor
      .update(schema.userProfiles)
      .set({ ...updates, lastActiveAt: new Date() })
      .where(eq(schema.userProfiles.userId, userId))
      .returning();
    return result[0];
  }
}