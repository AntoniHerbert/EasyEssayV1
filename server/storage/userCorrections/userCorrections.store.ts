import { type UserCorrection, type InsertUserCorrection } from "@shared/schema";
import { type Tx } from "../types"; 

export interface IUserCorrectionStore {
  getUserCorrections(essayId: string): Promise<UserCorrection[]>;
  createUserCorrection(correction: InsertUserCorrection, tx?: Tx): Promise<UserCorrection>;
  updateUserCorrection(id: string, updates: Partial<InsertUserCorrection>, tx?: Tx): Promise<UserCorrection | undefined>;
  deleteByEssayId(essayId: string, tx?: Tx): Promise<void>;
}