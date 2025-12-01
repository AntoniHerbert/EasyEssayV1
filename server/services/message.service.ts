import { IMessageStore } from "../storage/messages/message.store";
import type { ITransactionManager } from "../storage/transaction";
import { CreateMessageInput, insertUserMessageSchema } from "@shared/schema";
import { encrypt, decrypt } from "../utils/encryption";
import type { INotificationService } from "./notifications/notification.interface";

export class MessageService {

    constructor(
    private notificationService: INotificationService,
    private messageStore: IMessageStore,
    private txManager: ITransactionManager
  ) {}

  /**
   * Busca mensagens de um usuário.
   * Regra de Segurança: Um usuário só pode ver suas próprias mensagens.
   */
  async getUserMessages(targetUserId: string, requestingUserId: string, unreadOnly: boolean) {
    if (targetUserId !== requestingUserId) {
      throw new Error("FORBIDDEN_ACCESS");
    }

    const messages = await this.messageStore.getUserMessages(targetUserId, unreadOnly);

    return messages.map(msg => ({
      ...msg,
      content: decrypt(msg.content) 
    }));
  }

  /**
   * Envia uma mensagem.
   * Regra: Não pode enviar para si mesmo.
   */
  async sendMessage(fromUserId: string, data: CreateMessageInput) {


    if (data.toUserId === fromUserId) {
      throw new Error("CANNOT_SEND_TO_SELF");
    }

    const encryptedContent = encrypt(data.content);

    const message = await this.messageStore.createUserMessage({
      ...data,
      content: encryptedContent,
      fromUserId,
    });

    const decryptedMessage = {
      ...message,
      content: data.content // Usamos o texto original que já temos em memória
    };

    // 2. Avisamos o serviço de notificação
    this.notificationService.notifyNewMessage(message.toUserId, decryptedMessage);

    return message;
  }

  /**
   * Marca uma mensagem como lida.
   * Regra: A mensagem deve pertencer ao usuário que está fazendo a requisição (toUserId).
   */
  async markAsRead(messageId: string, requestingUserId: string) {
    const message = await this.messageStore.getMessageById(messageId);

    if (!message) {
 
      throw new Error("MESSAGE_NOT_FOUND");
    }

    if (message.toUserId !== requestingUserId) {
      throw new Error("FORBIDDEN_access"); 
    }

    if (message.isRead){
        return message;
    }


    const updated = await this.messageStore.markMessageAsRead(messageId);
    if (!updated) {
      throw new Error("MESSAGE_NOT_FOUND");
    }
    
    return updated;
  }
}