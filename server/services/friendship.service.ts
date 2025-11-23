import { IFriendshipStore } from "../storage/friendships/friendship.store";
import type { ITransactionManager } from "../storage/transaction";
import { CreateFriendshipInput, insertFriendshipSchema, UpdateFriendshipInput } from "@shared/schema";

export class FriendshipService {

    constructor(
    private friendshipStore: IFriendshipStore,
    private txManager: ITransactionManager 
  ) {}

  /**
   * Busca amizades de um usuário.
   */
  async getFriendships(userId: string, status?: string) {
    return await this.friendshipStore.getFriendships(userId, status);
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
      f => f.addresseeId === data.addresseeId || f.requesterId === friendshipData.addresseeId
    );

    if (alreadyExists) {
      throw new Error("FRIENDSHIP_ALREADY_EXISTS");
    }

    return await this.friendshipStore.createFriendship({
      ...data,
      requesterId,
    });
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