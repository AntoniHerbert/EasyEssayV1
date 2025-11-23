import type { IUserStore } from "../storage/users/user.store";
import type { IProfileStore } from "../storage/profiles/profile.store";
import type { ITransactionManager } from "../storage/transaction";
import { hashPassword, verifyPassword } from "../auth"; 

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
  async registerUser(rawBody: any) {
    const { username, password, displayName, bio } = rawBody;

    if (!username || !password || !displayName) {
      throw new Error("MISSING_FIELDS");
    }

    const existingUser = await this.userStore.getUserByUsername(username);
    if (existingUser) {
      throw new Error("USERNAME_TAKEN");
    }

    const passwordHash = await hashPassword(password);

    const newUser = await this.txManager.transaction(async (tx) => {

    const user = await this.userStore.createUser({ username, passwordHash }, tx);

    await this.profileStore.createUserProfile({
      userId: user.id,
      username,
      displayName,
      bio: bio || "",
    }, tx);

    return user;
  }

  /**
   * Autentica um usuário.
   * Responsabilidade: Verificar existência e validar senha.
   */
  async loginUser(rawBody: any) {
    const { username, password } = rawBody;

    if (!username || !password) {
      throw new Error("MISSING_FIELDS");
    }

    const user = await this.userStore.getUserByUsername(username);
    
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return user;
  }

  /**
   * Busca o usuário atual pelo ID da sessão.
   */
  async getCurrentUser(userId: string) {
    return await this.userStore.getUser(userId);
  }
}