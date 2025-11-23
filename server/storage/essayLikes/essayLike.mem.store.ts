import { type EssayLike, type InsertEssayLike } from "@shared/schema";
import { IEssayLikeStore } from "./essayLike.store";
import { randomUUID } from "crypto";
import { type Tx } from "../types";

export class EssayLikeMemStore implements IEssayLikeStore {
  private essayLikes: Map<string, EssayLike>;

  constructor() {
    this.essayLikes = new Map();
  }

  async getEssayLikes(essayId: string): Promise<EssayLike[]> {
    return Array.from(this.essayLikes.values())
      .filter(like => like.essayId === essayId);
  }

  async createEssayLike(insertEssayLike: InsertEssayLike, _tx?: Tx): Promise<EssayLike> {
    const id = randomUUID();
    const like: EssayLike = {
      ...insertEssayLike,
      id,
      createdAt: new Date(),
    };
    this.essayLikes.set(id, like);
    return like;
  }

  async deleteEssayLike(essayId: string, userId: string, _tx?: Tx): Promise<boolean> {
    const likeEntry = Array.from(this.essayLikes.entries())
      .find(([_, like]) => like.essayId === essayId && like.userId === userId);
    
    if (likeEntry) {
      this.essayLikes.delete(likeEntry[0]);
      return true;
    }
    return false;
  }

  async isEssayLiked(essayId: string, userId: string): Promise<boolean> {
    return Array.from(this.essayLikes.values())
      .some(like => like.essayId === essayId && like.userId === userId);
  }

  async deleteByEssayId(essayId: string, _tx?: Tx): Promise<void> {
    for (const [id, like] of this.essayLikes.entries()) {
      if (like.essayId === essayId) {
        this.essayLikes.delete(id);
      }
    }
  }
}