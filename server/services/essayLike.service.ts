import { IEssayStore } from "server/storage/essays/essay.store";
import { IEssayLikeStore } from "../storage/essayLikes/essayLike.store";
import type { ITransactionManager } from "../storage/transaction";

export class EssayLikeService {

    constructor(
    private essayLikeStore: IEssayLikeStore,
    private essayStore: IEssayStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Retorna a lista de likes de uma redação.
   */
  async getLikesCount(essayId: string) {
    return await this.essayLikeStore.countEssayLikes(essayId);
  }

  /**
   * Lógica de "Toggle":
   */
  async toggleLike(essayId: string, userId: string) {

    const essay = await this.essayStore.getEssay(essayId);
    if (!essay) {
      throw new Error("ESSAY_NOT_FOUND");
    }

    if (essay.authorId === userId) {
      throw new Error("CANNOT_LIKE_OWN_ESSAY");
    }

    if (!essay.isPublic && essay.authorId !== userId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    const isLiked = await this.essayLikeStore.isEssayLiked(essayId, userId);

    if (isLiked) {
      await this.essayLikeStore.deleteEssayLike(essayId, userId);
      return { liked: false };
    } else {
      await this.essayLikeStore.createEssayLike({ essayId, userId });
      return { liked: true };
    }
  }
}