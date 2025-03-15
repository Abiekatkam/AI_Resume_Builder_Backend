import { Router } from "express";
import {
  createResume,
  deleteResumeById,
  getAllResume,
  getResumeById,
  uniqueResumeTemplateName,
  updateResume,
} from "../controllers/resume.controller.js";

const router = Router();
router.route("/create").post(createResume);
router.route("/get-all-resume/:userId").get(getAllResume);
router.route("/update").put(updateResume);
router.route("/get-resume-by-id").post(getResumeById);
router.route("/unique-template-name").post(uniqueResumeTemplateName);
router.route("/delete-resume-by-id/:id").delete(deleteResumeById);

export default router;