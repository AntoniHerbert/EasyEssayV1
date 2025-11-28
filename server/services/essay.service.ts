import { 
    CreateEssayInput,
  insertEssaySchema, 
  UpdateEssayInput, 
  type InsertEssay 
} from "@shared/schema";
import type { IEssayStore } from "../storage/essays/essay.store";
import type { IProfileStore } from "../storage/profiles/profile.store";
import type { ITransactionManager } from "../storage/transaction";
import type { IPeerReviewStore } from "../storage/peerReviews/peerReview.store";
import type { IEssayLikeStore } from "../storage/essayLikes/essayLike.store"; 
import type { IUserCorrectionStore } from "../storage/userCorrections/userCorrections.store";
import type { AiService } from "./ai.service";
import { z } from "zod";


export class EssayService {

    constructor(
    private essayStore: IEssayStore,
    private profileStore: IProfileStore,
    private aiService: AiService,

    private peerReviewStore: IPeerReviewStore,
    private essayLikeStore: IEssayLikeStore,
    private userCorrectionStore: IUserCorrectionStore,

    private txManager: ITransactionManager 
  ) {}


  async getEssays(requestingUserId: string | undefined, isPublicString?: string, authorIdFilter?: string) {
    let isPublic = isPublicString === "true" ? true : isPublicString === "false" ? false : undefined;
    const isViewingOwnProfile = authorIdFilter && authorIdFilter === requestingUserId;
    if (!isViewingOwnProfile) {
      isPublic = true;
    }

    return await this.essayStore.getEssays(isPublic, authorIdFilter);
  }

  async getEssayById(essayId: string, requestingUserId: string) {
    const essay = await this.essayStore.getEssay(essayId);
    
    if (!essay) {
      return null; 
    }

    if (!essay.isPublic && essay.authorId !== requestingUserId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    return essay;
  }

  async createEssay(userId: string, data: CreateEssayInput) {
    const userProfile = await this.profileStore.getUserProfile(userId);
    const wordCount = data.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    const essay = await this.essayStore.createEssay({
      ...data,
      authorId: userId,
      authorName: userProfile?.displayName || "Anonymous",
      wordCount,
    });
    

    if (essay.isPublic) {
      console.log(`[EssayService] Triggering auto-analysis for essay: ${essay.id}`);
      this.aiService.analyzeEssay(essay.id).catch(err => {
        console.error(`[EssayService] Background analysis failed for ${essay.id}:`, err);
      });
    }
    
    return essay;
  }

async updateEssay(id: string, data: UpdateEssayInput) {
  
    if (data.content) {
      data.wordCount = data.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    return await this.essayStore.updateEssay(id, data);
  }

  async deleteEssay(id: string) {
    const essay = await this.essayStore.getEssay(id);
    if (!essay) return false;

    await this.txManager.transaction(async (tx) => {

      await Promise.all([
        this.peerReviewStore.deleteByEssayId(id, tx),
        this.essayLikeStore.deleteByEssayId(id, tx),
        this.userCorrectionStore.deleteByEssayId(id, tx)
      ]);

      await this.essayStore.deleteEssay(id, tx);
    });

    return true;
  }

}