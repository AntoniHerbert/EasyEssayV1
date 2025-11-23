import { type UserProfile, type InsertUserProfile } from "@shared/schema";
import { type Tx } from "../types";

export interface IProfileStore {
  getAllUsers(): Promise<UserProfile[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile, tx?: Tx): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<InsertUserProfile>, tx?: Tx): Promise<UserProfile | undefined>;
}