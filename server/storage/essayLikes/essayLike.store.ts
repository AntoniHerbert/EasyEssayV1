import { type EssayLike, type InsertEssayLike } from "@shared/schema";
import { type Tx } from "../types";

export interface IEssayLikeStore {
  getEssayLikes(essayId: string): Promise<EssayLike[]>;
  createEssayLike(like: InsertEssayLike, tx?: Tx): Promise<EssayLike>;
  deleteEssayLike(essayId: string, userId: string, tx?: Tx): Promise<boolean>;
  isEssayLiked(essayId: string, userId: string): Promise<boolean>;
  deleteByEssayId(essayId: string, tx?: Tx): Promise<void>;
}