import prisma from "../../prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, clerk_id, phoneNumber, avatarUrl } = req.body;

  if ([email].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "email fields are required");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerk_id }, { email }],
    },
  });

  if (existingUser) {
    // Update existing user
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName,
        clerk_id,
        phoneNumber,
        avatarUrl,
        updatedAt: new Date(),
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User login successful"));
  }

  // Create new user if not found
  const user = await prisma.user.create({
    data: {
      avatarUrl,
      email,
      fullName,
      clerk_id,
      phoneNumber,
      avatarUrl,
      createdAt: new Date()
    },
  });

  const userCreated = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
    },
  });

  if (!userCreated) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  res
    .status(201)
    .json(new ApiResponse(201, userCreated, "User created successfully"));
});

export { registerUser };
