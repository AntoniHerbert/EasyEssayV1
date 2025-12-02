import { Router } from "express";
import { friendshipService } from "../services";
import { createFriendshipSchema, insertFriendshipSchema, updateFriendshipSchema } from "@shared/schema"; 
import { catchAsync } from "./middlewares/errorHandler"; 
import { isAuthenticated } from "./middlewares/isAuthenticated"; 
import { validateBody } from "./middlewares/validation";

const router = Router();

// =================================================================
// 🔒 Rotas Protegidas (Exigem login)
// =================================================================

router.use(isAuthenticated);

/**
 * Busca amizades para um usuário específico.
 * @query status {string} (opcional) Filtra por status (ex: 'pending', 'accepted').
 */
router.get("/:userId", catchAsync(async (req, res) => {
  
  try {
      const friendships = await friendshipService.getFriendships(
        req.params.userId,  
        req.session.userId!, 
        req.query.status as string
      );
      res.json(friendships);
    } catch (error: any) {
      if (error.message === "FORBIDDEN_ACCESS") {
        return res.status(403).json({ message: "You can only view your own friendships" });
      }
      throw error;
    }
}));

/**
 * Cria um novo pedido de amizade.
 * O 'requesterId' é pego automaticamente da sessão do usuário logado.
 */
router.post("/", validateBody(createFriendshipSchema), catchAsync(async (req, res) => {
  try {
      const friendship = await friendshipService.createFriendRequest(
        req.session.userId!, 
        req.body
      );
      res.status(201).json(friendship);
    } catch (error: any) {

      if (error.message === "CANNOT_ADD_SELF") {
        return res.status(400).json({ message: "You cannot send a friend request to yourself" });
      }
      if (error.message === "FRIENDSHIP_ALREADY_EXISTS") {
        return res.status(409).json({ message: "Friendship or request already exists" });
      }
      throw error;
    }
}));

/**
 * Atualiza uma amizade (ex: aceitar, recusar ou bloquear um pedido).
 */
router.put("/:id", validateBody(updateFriendshipSchema), catchAsync(async (req, res) => {
  try {
      const friendship = await friendshipService.updateFriendshipStatus(
        req.params.id,
        req.session.userId!,
        req.body
      );
      res.json(friendship);
    } catch (error: any) {
      if (error.message === "FRIENDSHIP_NOT_FOUND") {
        return res.status(404).json({ message: "Friendship not found" });
      }
      if (error.message === "FORBIDDEN_UPDATE") {
        return res.status(403).json({ message: "You are not authorized to update this request" });
      }
      throw error;
    }
}));

// TODO: Você pode querer adicionar uma rota DELETE para remover/cancelar amizades
// router.delete("/:id", catchAsync(async (req, res) => { ... }));

export default router;