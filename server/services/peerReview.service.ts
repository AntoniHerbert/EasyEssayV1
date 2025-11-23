import { IEssayStore } from "../storage/essays/essay.store";
import { IPeerReviewStore } from "../storage/peerReviews/peerReview.store";
import type { ITransactionManager } from "../storage/transaction";
import { 
  insertPeerReviewSchema , 
  correctionSchema,
  UpdatePeerReviewInput,
  AddCorrectionInput
} from "@shared/schema";

export class PeerReviewService {

  constructor(
    private essayStore: IEssayStore,
    private peerReviewStore: IPeerReviewStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Busca todas as revisões de uma redação.
   */
  async getReviewsByEssayId(essayId: string) {
    return await this.peerReviewStore.getPeerReviews(essayId);
  }

  /**
   * Tenta criar uma revisão.
   * Retorna um objeto indicando o resultado e se foi criada agora ou já existia.
   * Lança erros para casos de negócio inválidos (404 ou 403).
   */
  async createReview(essayId: string, reviewerId: string, rawBody: unknown) {
    const essay = await this.essayStore.getEssay(essayId);
    if (!essay) {
      throw new Error("ESSAY_NOT_FOUND");
    }

    if (essay.authorId === reviewerId) {
      throw new Error("CANNOT_REVIEW_OWN_ESSAY");
    }

    const existingReview = await this.peerReviewStore.getPeerReview(essayId, reviewerId);
    if (existingReview) {
      return { review: existingReview, isNew: false };
    }

    const reviewData = insertPeerReviewSchema.parse({
      ...(rawBody as object),
      reviewerId,
      essayId
    });
    
    const newReview = await this.peerReviewStore.createPeerReview(reviewData);
    return { review: newReview, isNew: true };
  }

  /**
   * Atualiza uma revisão.
   */
  async updateReview(reviewId: string, userId: string, data: UpdatePeerReviewInput) {
    const existingReview = await this.peerReviewStore.getPeerReviewById(reviewId);
    
    if (!existingReview) {
      throw new Error("REVIEW_NOT_FOUND");
    }

    if (existingReview.reviewerId !== userId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    return await this.peerReviewStore.updatePeerReview(reviewId, data);
  }

  /**
   * Adiciona uma correção a uma revisão.
   */
  async addCorrection(reviewId: string, userId: string, data: AddCorrectionInput) {
    const existingReview = await this.peerReviewStore.getPeerReviewById(reviewId);

    if (!existingReview) {
      throw new Error("REVIEW_NOT_FOUND");
    }

    if (existingReview.reviewerId !== userId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    if (existingReview.isSubmitted) {
      throw new Error("REVIEW_ALREADY_SUBMITTED");
    }
    
    return await this.peerReviewStore.addCorrectionToReview(reviewId, data);
  }
}