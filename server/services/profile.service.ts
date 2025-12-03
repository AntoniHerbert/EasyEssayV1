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

  async getAllProfiles(cursorStr?: string, searchQuery?: string) {

    const limit = 20;

    let cursor: { totalEssays: number, id: string } | undefined;
    if (cursorStr) {
      try {
          cursor = JSON.parse(atob(cursorStr));
      } catch (e) {
          console.warn("Invalid cursor format", e);
      }
    }

    const safeSearch = searchQuery?.trim().slice(0, 50);

    const profiles = await this.profileStore.getAllUsers(limit, cursor, safeSearch);

    let nextCursor: string | null = null;
    if (profiles.length === limit) {
      const lastProfile = profiles[profiles.length - 1];
      const cursorObj = { 
        totalEssays: lastProfile.totalEssays, 
        id: lastProfile.id 
      };
      nextCursor = btoa(JSON.stringify(cursorObj));
    }
    return { data: profiles, nextCursor };
  }
}