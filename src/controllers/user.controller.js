import prisma from "../../prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, clerk_id, phoneNumber, username } = req.body;

  if ([email, username].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "email and username fields are required");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
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
        username: username.toLowerCase(),
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User login successful"));
  }

  // Create new user if not found
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      email,
      fullName,
      clerk_id,
      phoneNumber,
    },
  });

  const userCreated = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
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
