import { Router } from "express";
import { createHtmlTemplate, createHtmlWithTemplate, convertImageToHtml } from "../controllers/openAi.controller.js";
import upload from "../utils/multer.js"; // Import the multer configuration

const router = Router();

// Route for creating HTML template
router.route("/createHtmlTemplate").post(createHtmlTemplate);

// Route for creating HTML with template
router.route("/createHtmlWithTemplate").post(createHtmlWithTemplate);

// Route for converting image to HTML (with multer middleware for file upload)
router.route("/convert-image").post(upload.single('image'), convertImageToHtml);

export default router;