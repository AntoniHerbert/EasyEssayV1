import { IProfileStore } from "../storage/profiles/profile.store";
import type { ITransactionManager } from "../storage/transaction";
import { CreateProfileInput, insertUserProfileSchema, UpdateProfileInput } from "@shared/schema";

export class ProfileService {

    constructor(
    private profileStore: IProfileStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Busca um perfil pelo ID do usuário.
   */
  async getProfileByUserId(userId: string) {
    return await this.profileStore.getUserProfile(userId);
  }

  /**
   * Cria um novo perfil.
   */
  async createProfile(authUserId: string, data: CreateProfileInput) {

    const existingProfile = await this.profileStore.getUserProfile(authUserId);
    
    if (existingProfile) {
      throw new Error("PROFILE_ALREADY_EXISTS");
    }

    return await this.profileStore.createUserProfile({
      ...data,
      userId: authUserId, 
    });
  }

  /**
   * Atualiza um perfil existente.
   */
  async updateProfile(targetUserId: string, requestingUserId: string, data: UpdateProfileInput) {
    if (targetUserId !== requestingUserId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    const safeUpdates: UpdateProfileInput = {
      displayName: data.displayName,
      bio: data.bio,
      avatar: data.avatar,
    };

    Object.keys(safeUpdates).forEach(key => 
      (safeUpdates as any)[key] === undefined && delete (safeUpdates as any)[key]
    );

    const updatedProfile = await this.profileStore.updateUserProfile(targetUserId, safeUpdates);
    
    if (!updatedProfile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    return updatedProfile;
  }

  async getAllProfiles() {
    // TODO: Implementar paginação real (limit/offset) no futuro
    return await this.profileStore.getAllUsers();
  }
}