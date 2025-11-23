import { type UserCorrection, type InsertUserCorrection } from "@shared/schema";
import { IUserCorrectionStore } from "./userCorrection.store";
import { randomUUID } from "crypto";
import { type Tx } from "../types"; 

export class UserCorrectionMemStore implements IUserCorrectionStore {
  private userCorrections: Map<string, UserCorrection>;

  constructor() {
    this.userCorrections = new Map();
  }

  async getUserCorrections(essayId: string): Promise<UserCorrection[]> {
    return Array.from(this.userCorrections.values())
      .filter(correction => correction.essayId === essayId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createUserCorrection(insertUserCorrection: InsertUserCorrection, _tx?: Tx): Promise<UserCorrection> {
    const id = randomUUID();
    const userCorrection: UserCorrection = {
      ...insertUserCorrection,
      id,
      likes: 0,
      createdAt: new Date(),
    };
    this.userCorrections.set(id, userCorrection);
    return userCorrection;
  }

  async updateUserCorrection(id: string, updates: Partial<InsertUserCorrection>, _tx?: Tx): Promise<UserCorrection | undefined> {
    const userCorrection = this.userCorrections.get(id);
    if (!userCorrection) return undefined;

    const updatedUserCorrection: UserCorrection = {
      ...userCorrection,
      ...updates,
    };
    this.userCorrections.set(id, updatedUserCorrection);
    return updatedUserCorrection;
  }

  async deleteByEssayId(essayId: string, _tx?: Tx): Promise<void> {
  for (const [id, correction] of Array.from(this.userCorrections.entries())) {
    if (correction.essayId === essayId) {
        this.userCorrections.delete(id);
      }
    }
  }
}