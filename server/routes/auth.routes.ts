import { Router } from "express";
import { AuthService } from "../services/auth.service";
import { hashPassword, verifyPassword } from "../auth"; 
import { catchAsync } from "./middlewares/errorHandler";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { validateBody } from "./middlewares/validation";
import { loginSchema, registerSchema } from "@shared/schema";

const router = Router();

router.post("/signup", validateBody(registerSchema), catchAsync(async (req, res) => {
    const user = await AuthService.registerUser(req.body); 
    req.session.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username });
}));

router.post("/login", validateBody(loginSchema), catchAsync(async (req, res) => {
    const user = await AuthService.loginUser(req.body); 
    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
}));

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});


router.get("/me", isAuthenticated, catchAsync(async (req, res) => {
  const user = await AuthService.getCurrentUser(req.session.userId!);
  if (!user) {
    // Isso pode acontecer se o usuário for deletado enquanto logado
    req.session.destroy(() => {});
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ id: user.id, username: user.username });
}));

export default router;