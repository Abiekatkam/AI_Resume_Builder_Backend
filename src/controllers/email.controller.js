import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/emailService.js';
import { ApiResponse } from "../utils/ApiResponse.js";


const sendEmailController = asyncHandler(async (req, res) => {
  const { to, subject, htmlContent } = req.body;

  if (!to || !subject || !htmlContent) {
    return res.status(400).json({ message: 'All fields (to, subject, htmlContent) are required' });
  }

  try {
    await sendEmail(to, subject, htmlContent);
    res.status(200).json(new ApiResponse(201, {}, "Email sent successfully"))
  } catch (error) {
    res.status(500).json(new ApiResponse(500, {}, "Error sending email"))
  }
});

export { sendEmailController };
