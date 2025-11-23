import { type Friendship, type InsertFriendship } from "@shared/schema";
import { type Tx } from "../types";

export interface IFriendshipStore {
  getFriendships(userId: string, status?: string): Promise<Friendship[]>;
  createFriendship(friendship: InsertFriendship, tx?: Tx): Promise<Friendship>;
  updateFriendship(id: string, updates: Partial<InsertFriendship>, tx?: Tx): Promise<Friendship | undefined>;
}