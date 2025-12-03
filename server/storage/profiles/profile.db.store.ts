import { type DrizzleDb } from "../index";
import * as schema from "@shared/schema";
import { desc, eq, ilike, or, sql, and } from "drizzle-orm";
import { type UserProfile, type InsertUserProfile } from "@shared/schema";
import { IProfileStore } from "./profile.store";
import { type Tx } from "../types"; 


export class ProfileDbStore implements IProfileStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getAllUsers(
    limit = 20, 
    cursor?: { totalEssays: number, id: string }, 
    searchQuery?: string
  ): Promise<schema.UserProfileWithAuth[]> {
    let query = this.db
    .select({
      profile: schema.userProfiles,
      authUsername: schema.users.username,
    })
    .from(schema.userProfiles)
    .leftJoin(
      schema.users,
      eq(schema.userProfiles.userId, schema.users.id)
    );

    const conditions = [];

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;

      conditions.push(
        or(
          ilike(schema.userProfiles.displayName, searchPattern),
          ilike(schema.users.username, searchPattern)
        )
      );
    }

    if (cursor) {
      conditions.push(sql`
        (${schema.userProfiles.totalEssays} < ${cursor.totalEssays}) OR 
        (${schema.userProfiles.totalEssays} = ${cursor.totalEssays} AND ${schema.userProfiles.id} < ${cursor.id})
      `);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query
    .limit(limit)
    .orderBy(desc(schema.userProfiles.totalEssays), desc(schema.userProfiles.id));

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