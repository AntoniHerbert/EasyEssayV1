import { Router } from "express";
import { profileService } from "server/services";
import { catchAsync } from "./middlewares/errorHandler"; 
import { isAuthenticated } from "./middlewares/isAuthenticated";

const router = Router();

// =================================================================
// 🔒 Rotas Protegidas (Exigem login)
// =================================================================

router.use(isAuthenticated);

/**
 * Busca uma lista de todos os usuários no sistema.
 */
router.get("/", catchAsync(async (req, res) => {

const users = await profileService.getAllProfiles();
  res.json(users);
}));

export default router;