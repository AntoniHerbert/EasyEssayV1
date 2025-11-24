import type { IEssayStore } from "../storage/essays/essay.store";
import type { IPeerReviewStore } from "../storage/peerReviews/peerReview.store";
import type { ITransactionManager } from "../storage/transaction";
import { getMockAIReview } from "./mock-analysis";
import { analyzeEssayWithOpenAI } from "./openai";

export class AiService {

    constructor(
    private essayStore: IEssayStore,
    private peerReviewStore: IPeerReviewStore,
    private txManager: ITransactionManager,
  ) {}

  /**
   * Analisa uma única redação.
   * Pode ser chamado manualmente (pela rota /analyze) ou automaticamente (ao criar essay).
   */
  async analyzeEssay(essayId: string) {
    const essay = await this.essayStore.getEssay(essayId);
    if (!essay) return null;

    await this.runAiAnalysis(essay.id, essay.title, essay.content);
    
    return await this.peerReviewStore.getPeerReview(essay.id, "AI");
  }

  /**
   * Analisa todas as redações públicas pendentes.
   */
  async batchAnalyzeEssays() {
    const allEssays = await this.essayStore.getEssays(true); // Apenas públicas
    const stats = { success: 0, failed: 0, skipped: 0 };

    for (const essay of allEssays) {
      const existingAIReview = await this.peerReviewStore.getPeerReview(essay.id, "AI");
      if (existingAIReview) {
        stats.skipped++;
        continue;
      }

      try {
        await this.runAiAnalysis(essay.id, essay.title, essay.content);
        stats.success++;
      } catch (error) {
        console.error(`[AiService] Failed batch analysis for ${essay.id}:`, error);
        stats.failed++;
      }
    }

    return { total: allEssays.length, ...stats };
  }

  /**
   * Lógica central privada de interação com a IA e persistência.
   */
  private async runAiAnalysis(essayId: string, title: string, content: string) {
    let aiReview;
    
    if (process.env.NODE_ENV === 'production' || process.env.USE_REAL_AI === 'true') {
          try {
            console.log(`[AiService] Calling OpenAI for essay ${essayId}...`);
            aiReview = await analyzeEssayWithOpenAI(title, content);
          } catch (error) {
            console.error("[AiService] OpenAI failed, falling back to mock:", error);
            aiReview = getMockAIReview(title, content);
          }
        } else {
          console.log(`[AiService] Using Mock AI for essay ${essayId}...`);
          aiReview = getMockAIReview(title, content);
        }

    const existingReview = await this.peerReviewStore.getPeerReview(essayId, "AI");
    
    if (existingReview) {
      await this.peerReviewStore.updatePeerReview(existingReview.id, {
        grammarScore: aiReview.grammarScore,
        styleScore: aiReview.styleScore,
        clarityScore: aiReview.clarityScore,
        structureScore: aiReview.structureScore,
        contentScore: aiReview.contentScore,
        researchScore: aiReview.researchScore,
        overallScore: aiReview.overallScore,
        corrections: aiReview.corrections,
      });
    } else {
      await this.peerReviewStore.createPeerReview({
        essayId: essayId,
        reviewerId: "AI",
        grammarScore: aiReview.grammarScore,
        styleScore: aiReview.styleScore,
        clarityScore: aiReview.clarityScore,
        structureScore: aiReview.structureScore,
        contentScore: aiReview.contentScore,
        researchScore: aiReview.researchScore,
        overallScore: aiReview.overallScore,
        corrections: aiReview.corrections,
        isSubmitted: true,
      });
    }

    await this.essayStore.updateEssay(essayId, { isAnalyzed: true });
  }
}