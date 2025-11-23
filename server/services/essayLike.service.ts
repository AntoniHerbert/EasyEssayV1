import { IEssayLikeStore } from "../storage/essayLikes/essayLike.store";
import type { ITransactionManager } from "../storage/transaction";

export class EssayLikeService {

    constructor(
    private essayLikeStore: IEssayLikeStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Retorna a lista de likes de uma redação.
   */
  async getLikes(essayId: string) {
    return await this.essayLikeStore.getEssayLikes(essayId);
  }

  /**
   * Lógica de "Toggle":
   */
  async toggleLike(essayId: string, userId: string) {
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