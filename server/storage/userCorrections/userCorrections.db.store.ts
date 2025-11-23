import { type DrizzleDb } from "../index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { type UserCorrection, type InsertUserCorrection } from "@shared/schema";
import { IUserCorrectionStore } from "./userCorrection.store";
import { type Tx } from "../types"; 


export class UserCorrectionDbStore implements IUserCorrectionStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getUserCorrections(essayId: string): Promise<UserCorrection[]> {
    const result = await this.db
      .select()
      .from(schema.userCorrections)
      .where(eq(schema.userCorrections.essayId, essayId));
    return result;
  }

  async createUserCorrection(correction: InsertUserCorrection, tx?: Tx): Promise<UserCorrection> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor.insert(schema.userCorrections).values(correction).returning();
    return result[0];
  }

  async updateUserCorrection(id: string, updates: Partial<InsertUserCorrection>, tx?: Tx): Promise<UserCorrection | undefined> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor
      .update(schema.userCorrections)
      .set(updates)
      .where(eq(schema.userCorrections.id, id))
      .returning();
    return result[0];
  }
}