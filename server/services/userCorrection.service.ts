import { 
  IUserCorrectionStore 
} from "../storage/userCorrections/userCorrections.store";
import type { ITransactionManager } from "../storage/transaction";
import { 
  insertUserCorrectionSchema 
} from "@shared/schema";

export class UserCorrectionService {

    constructor(
    private userCorrectionStore: IUserCorrectionStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Busca todas as correções de uma redação específica.
   */
  async getCorrectionsByEssayId(essayId: string) {
    return await this.userCorrectionStore.getUserCorrections(essayId);
  }

  /**
   * Cria uma nova correção para uma redação.
   * Recebe o ID da redação e o corpo da requisição (rawBody).
   */
  async createCorrection(essayId: string, rawBody: unknown) {
    const correctionData = insertUserCorrectionSchema.parse({
      ...(rawBody as object),
      essayId: essayId,
    });

    return await this.userCorrectionStore.createUserCorrection(correctionData);
  }

  // Futuramente, você pode adicionar métodos aqui como:
  // async likeCorrection(id: string) ...
  // async deleteCorrection(id: string) ...
}