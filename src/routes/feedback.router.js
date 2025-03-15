import { Router } from "express";
import { AddFeedback ,GetAllFeedbacks} from "../controllers/feedback.controller.js";

const router = Router();

router.route("/AddFeedback").post(AddFeedback);
router.route("/GetFeedback").post(GetAllFeedbacks);



export default router;