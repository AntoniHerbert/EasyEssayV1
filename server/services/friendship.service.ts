import { IFriendshipStore } from "../storage/friendships/friendship.store";
import type { ITransactionManager } from "../storage/transaction";
import { CreateFriendshipInput, insertFriendshipSchema, UpdateFriendshipInput } from "@shared/schema";
import { INotificationService } from "./notifications/notification.interface";
import { IProfileStore } from "server/storage/profiles/profile.store";


export class FriendshipService {

    constructor(
    private friendshipStore: IFriendshipStore,
    private profileStore: IProfileStore, 
    private notificationService: INotificationService,
    private txManager: ITransactionManager 
  ) {}

  /**
   * Busca amizades de um usuário.
   */
  async getFriendships(targetUserId: string, requestingUserId:  string, status?: string) {

    if (targetUserId !== requestingUserId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    return await this.friendshipStore.getFriendships(targetUserId, status);
  }

  /**
   * Cria um novo pedido de amizade.
   */
  async createFriendRequest(requesterId: string, data: CreateFriendshipInput) {

    if (data.addresseeId === requesterId) {
      throw new Error("CANNOT_ADD_SELF");
    }

    const existingFriendships = await this.friendshipStore.getFriendships(requesterId);
    const alreadyExists = existingFriendships.find(
      f => f.addresseeId === data.addresseeId || f.requesterId === data.addresseeId
    );

    if (alreadyExists) {
      throw new Error("FRIENDSHIP_ALREADY_EXISTS");
    }

    const friendship = await this.friendshipStore.createFriendship({
      ...data,
      requesterId,
      status: "pending" 
    });

    const requesterProfile = await this.profileStore.getUserProfile(requesterId);
    const requesterName = requesterProfile?.displayName || "Someone";

    this.notificationService.notifyFriendRequest(
      data.addresseeId, 
      requesterName     
    );

    return friendship;
  }

  /**
   * Atualiza o status de uma amizade (Aceitar/Recusar).
   */
  async updateFriendshipStatus(friendshipId: string, userId: string, data: UpdateFriendshipInput) {

    const userFriendships = await this.friendshipStore.getFriendships(userId);
    const friendship = userFriendships.find(f => f.id === friendshipId);

    if (!friendship) {
      throw new Error("FRIENDSHIP_NOT_FOUND");
    }

    if (friendship.addresseeId !== userId) {
      throw new Error("FORBIDDEN_UPDATE");
    }

    return await this.friendshipStore.updateFriendship(friendshipId, data);
  }
}