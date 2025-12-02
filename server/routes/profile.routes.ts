import { Router } from "express";
import { profileService } from "../services";
import { catchAsync } from "./middlewares/errorHandler"; 
import { isAuthenticated } from "./middlewares/isAuthenticated"; 
import { validateBody } from "./middlewares/validation";
import { createProfileSchema, updateProfileSchema } from "@shared/schema";

const router = Router();


// =================================================================
// 🔒 Rotas Protegidas (Exigem login)
// =================================================================

router.use(isAuthenticated);

/**
 * Busca um perfil de usuário público.
 */
router.get("/:userId", catchAsync(async (req, res) => {
const profile = await profileService.getProfileByUserId(req.params.userId); 
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }
  res.json(profile);
}));

/**
 * Cria um novo perfil de usuário.
 * (Mantendo a lógica original conforme solicitado)
 */
router.post("/", validateBody(createProfileSchema), catchAsync(async (req, res) => {
  try {
      const profile = await profileService.createProfile(
        req.session.userId!, 
        req.body
      );
      res.status(201).json(profile);
    } catch (error: any) {
      if (error.message === "PROFILE_ALREADY_EXISTS") {
        return res.status(409).json({ message: "Profile already exists for this user" });
      }
      throw error;
    }
}));

/**
 * Atualiza o perfil do próprio usuário.
 */
router.put("/:userId", validateBody(updateProfileSchema), catchAsync(async (req, res) => {
  try {
      const profile = await profileService.updateProfile(
        req.params.userId,
        req.session.userId!,
        req.body
      );
      
      res.json(profile);
    } catch (error: any) {
      if (error.message === "FORBIDDEN_ACCESS") {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      if (error.message === "PROFILE_NOT_FOUND") {
        return res.status(404).json({ message: "Profile not found" });
      }
      throw error;
    }
}));

export default router;