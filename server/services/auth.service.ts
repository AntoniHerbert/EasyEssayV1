import type { IUserStore } from "../storage/users/user.store";
import type { IProfileStore } from "../storage/profiles/profile.store";
import type { ITransactionManager } from "../storage/transaction";
import { hashPassword, verifyPassword } from "../auth"; 
import { LoginInput, RegisterInput } from "@shared/schema";

const DUMMY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.1234567890abcdef1234567890abcdef";

export class AuthService {

    constructor(
    private userStore: IUserStore,
    private profileStore: IProfileStore,
    private txManager: ITransactionManager,
  ) {}

  /**
   * Registra um novo usuário.
   * Responsabilidade: Criar User + Criar Profile + Hash de Senha.
   */
  async registerUser(data: RegisterInput) {

    const existingUser = await this.userStore.getUserByUsername(data.username);
    if (existingUser) {
      throw new Error("USERNAME_TAKEN");
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await this.txManager.transaction(async (tx) => {

    const user = await this.userStore.createUser({ username: data.username, passwordHash }, tx);

    await this.profileStore.createUserProfile({
      userId: user.id,
      displayName: data.displayName,
      bio: data.bio || "",
    }, tx);
    return user;
    });
    return newUser;

  }

  /**
   * Autentica um usuário.
   * Responsabilidade: Verificar existência e validar senha.
   */
  async loginUser(data: LoginInput) {

    const user = await this.userStore.getUserByUsername(data.username);

    const hashToVerify = user ? user.passwordHash : DUMMY_HASH;
    
    const isPasswordValid = await verifyPassword(hashToVerify, data.password);
    
    if (!user || !isPasswordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return this.sanitizeUser(user);
  }

  /**
   * Busca o usuário atual pelo ID da sessão.
   */
  async getCurrentUser(userId: string) {
    const user = await this.userStore.getUser(userId);
    if (!user) return null;
    
    return this.sanitizeUser(user);
    }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}