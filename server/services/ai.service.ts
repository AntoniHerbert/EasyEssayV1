import type { IEssayStore } from "../storage/essays/essay.store";
import type { IPeerReviewStore } from "../storage/peerReviews/peerReview.store";
import type { ITransactionManager } from "../storage/transaction";
import { getMockAIReview } from "./mock-analysis";
import { analyzeEssayWithOpenAI, type AIReviewResult } from "./openai";

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

  private async updateEssayStats(essayId: string) {
    const stats = await this.peerReviewStore.getEssayStats(essayId);
    await this.essayStore.updateEssay(essayId, {
      reviewCount: stats.count,
      averageScore: stats.average
    });
  }

  /**
   * Lógica central privada de interação com a IA e persistência.
   */
private async runAiAnalysis(essayId: string, title: string, content: string) {

    const aiReview = await this.fetchReviewData(title, content);
    
    console.log(`[AiService] Analysis result for ${essayId}: Offensive=${aiReview.isOffensive}`);

    if (aiReview.isOffensive) {
      console.warn(`[AiService] 🚩 FLAGGED OFFENSIVE CONTENT: Essay ${essayId}`);
      
      await this.essayStore.updateEssay(essayId, { 
        isPublic: false, 
        isAnalyzed: true 
      });

      const warningComment = `⚠️ CONTEÚDO SINALIZADO: Esta redação foi identificada como ofensiva ou imprópria. Ela foi tornada privada automaticamente.\n\nMotivo: ${aiReview.offenseReason || "Violação de diretrizes."}`;

      await this.saveReviewInDatabase(essayId, aiReview, warningComment);

      await this.updateEssayStats(essayId);

      return;
    }


    await this.essayStore.updateEssay(essayId, { isAnalyzed: true, isPublic: true });
    
    await this.saveReviewInDatabase(essayId, aiReview, null);

    const stats = await this.peerReviewStore.getEssayStats(essayId);

    await this.essayStore.updateEssay(essayId, { 
      isAnalyzed: true,
      isPublic: true,
      reviewCount: stats.count,      
      averageScore: stats.average  
    });
  }


  

  /**
   * Auxiliar: Decide se usa IA Real ou Mock e retorna os dados padronizados.
   */
  private async fetchReviewData(title: string, content: string): Promise<AIReviewResult> {
    const useRealAi = process.env.NODE_ENV === 'production' || process.env.USE_REAL_AI === 'true';

    if (useRealAi) {
      try {
        console.log(`[AiService] Calling OpenAI/Groq...`);
        return await analyzeEssayWithOpenAI(title, content);
      } catch (error) {
        console.error("[AiService] AI API failed, falling back to mock:", error);
        return this.getMockData(title, content);
      }
    }

    console.log(`[AiService] Using Mock AI...`);
    return this.getMockData(title, content);
  }



  /**
   * Auxiliar: Garante que o Mock tenha a estrutura nova (com campos de moderação)
   */
  private getMockData(title: string, content: string): AIReviewResult {
    const mock = getMockAIReview(title, content);
    return {
      ...mock,
      isOffensive: false, // Mock é sempre seguro
      offenseReason: undefined
    };
  }

  /**
   * Auxiliar: Lógica de UPSERT (Criar ou Atualizar) da Review no Banco
   */
  private async saveReviewInDatabase(essayId: string, aiReview: AIReviewResult, overrideComment: string | null) {
    const reviewData = {
      grammarScore: aiReview.grammarScore,
      styleScore: aiReview.styleScore,
      clarityScore: aiReview.clarityScore,
      structureScore: aiReview.structureScore,
      contentScore: aiReview.contentScore,
      researchScore: aiReview.researchScore,
      overallScore: aiReview.overallScore,
      corrections: aiReview.corrections,
      reviewComment: overrideComment || "Análise automática da IA.", 
      isSubmitted: true
    };

    const existingReview = await this.peerReviewStore.getPeerReview(essayId, "AI");

    if (existingReview) {
      await this.peerReviewStore.updatePeerReview(existingReview.id, reviewData);
    } else {
      await this.peerReviewStore.createPeerReview({
        ...reviewData,
        essayId: essayId,
        reviewerId: "AI",
      });
    }
  }
}