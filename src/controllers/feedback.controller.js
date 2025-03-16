import prisma from "../../prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const AddFeedback = asyncHandler(async (req, res) => {
  const { id, role, content } = req.body;

  if (!id || !role || !content) {
    throw new ApiError(400, "All fields (id, role, content) are required");
  }

  const existingUser = await prisma.user.findFirst({
    where: { clerk_id: id }, 
    select: {
      id: true,
      clerk_id : true,
      fullName: true,
      avatarUrl: true,
    },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const feedback = await prisma.feedBack.create({
    data: {
      clerk_id: existingUser.clerk_id, 
      author: existingUser.fullName,
      avatar: existingUser.avatarUrl,
      role: role,
      content: content,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, feedback, "Feedback added successfully"));
});


const GetAllFeedbacks = asyncHandler(async (req , res) => {
  // Step 1: Get the latest feedback for each user
  const latestFeedbacks = await prisma.feedBack.groupBy({
    by: ["clerk_id"], // Group by user ID
    _max: {
      createdAt: true, // Get the latest createdAt timestamp for each user
    },
  });

  // Step 2: Extract the latest feedback IDs
  const latestFeedbackIds = latestFeedbacks.map(
    (feedback) => feedback._max.createdAt
  );

  // Step 3: Fetch the full feedback details for the latest feedbacks
  const feedbacks = await prisma.feedBack.findMany({
    where: {
      createdAt: {
        in: latestFeedbackIds, // Filter by the latest feedback IDs
      },
    },
    orderBy: {
      createdAt: "desc", // Sort by createdAt in descending order
    },
    take: 18, // Limit to the latest 20 feedbacks
    select: {
      id: true,
      clerk_id: true,
      author: true,
      avatar: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  if (!feedbacks || feedbacks.length === 0) {
    throw new ApiError(404, "No feedbacks found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, feedbacks, "Latest 18 feedbacks retrieved successfully"));
});


export { AddFeedback, GetAllFeedbacks  };