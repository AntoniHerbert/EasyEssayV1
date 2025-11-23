import { Router } from "express";
import { EssayService } from "../services/essay.service"; 
import { UserCorrectionService } from "../services/userCorrection.service";
import { EssayLikeService } from "../services/essayLike.service"; 
import { PeerReviewService } from "../services/peerReview.service";
import { AiService } from "../services/ai.service";
import { validateBody } from "./middlewares/validation"; 
import { createEssayDTO, insertEssaySchema, updateEssayDTO } from "@shared/schema"; 

import { 
  insertPeerReviewSchema 
} from "@shared/schema"; 
import { catchAsync } from "./middlewares/errorHandler";
import { isAuthenticated } from "./middlewares/isAuthenticated";

const router = Router();

// =================================================================
// 🚀 Rotas Públicas
// =================================================================

router.get("/", catchAsync(async (req, res) => {
  const { isPublic, authorId } = req.query;
  const essays = await EssayService.getEssays(isPublic as string, authorId as string);
  res.json(essays);
}));

router.get("/:id", catchAsync(async (req, res) => {
  const essay = await EssayService.getEssayById(req.params.id);
  if (!essay) {
    return res.status(404).json({ message: "Essay not found" });
  }
  res.json(essay);
}));

router.get("/:id/user-corrections", catchAsync(async (req, res) => {
const userCorrections = await UserCorrectionService.getCorrectionsByEssayId(req.params.id);
res.json(userCorrections);
}));

router.get("/:id/likes", catchAsync(async (req, res) => {
const likes = await EssayLikeService.getLikes(req.params.id);
  res.json({ count: likes.length });
}));

router.get("/:essayId/peer-reviews", catchAsync(async (req, res) => {
const reviews = await PeerReviewService.getReviewsByEssayId(req.params.essayId);
res.json(reviews);
}));


// =================================================================
// 🔒 Rotas Protegidas
// =================================================================

router.use(isAuthenticated);

router.post("/", 
  validateBody(createEssayDTO), 
  catchAsync(async (req, res) => {

  const essay = await EssayService.createEssay(req.session.userId!, req.body);
  res.status(201).json(essay);
}));

router.put("/:id",
  validateBody(updateEssayDTO),
  catchAsync(async (req, res) => {

  const updatedEssay = await EssayService.updateEssay(req.params.id, req.body);
  if (!updatedEssay) {
    return res.status(404).json({ message: "Essay not found" });
  }
  res.json(updatedEssay);
}));

router.delete("/:id", catchAsync(async (req, res) => {

  const deleted = await EssayService.deleteEssay(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Essay not found" });
  }
  res.status(204).send();
}));

/**
 * (Admin) Batch Analysis
 */
router.post("/batch-analyze", catchAsync(async (req, res) => {

  const result = await AiService.batchAnalyzeEssays();
  res.json({ message: "Batch analysis complete", ...result });
}));

/**
 * Single Essay Analysis
 */
router.post("/:id/analyze", catchAsync(async (req, res) => {

  const result = await AiService.analyzeEssay(req.params.id);
  if (!result) {
    return res.status(404).json({ message: "Essay not found" });
  }
  res.json(result);
}));

router.post("/:id/user-corrections", catchAsync(async (req, res) => {

  const userCorrection = await UserCorrectionService.createCorrection(req.params.id, req.body);
  res.status(201).json(userCorrection);
}));

router.post("/:id/like", catchAsync(async (req, res) => {
  const userId = req.session.userId!;
  const essayId = req.params.id;
  const result = await EssayLikeService.toggleLike(essayId, userId); 
  
  res.json(result);
}));

router.post("/:essayId/peer-reviews", catchAsync(async (req, res) => {
  try {
      const { review, isNew } = await PeerReviewService.createReview(
        req.params.essayId, 
        req.session.userId!, 
        req.body
      );

      if (!isNew) {
        return res.json(review); 
      }
      res.status(201).json(review); 

    } catch (error: any) {
      if (error.message === "ESSAY_NOT_FOUND") {
        return res.status(404).json({ message: "Essay not found" });
      }
      if (error.message === "CANNOT_REVIEW_OWN_ESSAY") {
        return res.status(403).json({ message: "You cannot review your own essay" });
      }
      throw error;
    }
}));

export default router;