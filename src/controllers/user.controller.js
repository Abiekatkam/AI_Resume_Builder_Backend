import bcrypt from 'bcrypt';
import prisma from '../../prisma/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateAccessToken, generateRefreshToken } from '../utils/AccessRefreshToken.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, `Something went wrong while generating tokens: ${error.message}`);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ([username, email, password].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw new ApiError(409, 'User with username or email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      email,
      password: hashedPassword,
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
    throw new ApiError(500, 'Something went wrong while creating user');
  }

  res.status(201).json(new ApiResponse(201, userCreated, 'User created successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new ApiError(400, "Username or email and password are required");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier }
      ]
    }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshToken }
  });

  const loggedInUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      email: true,
    }
  });

  const options = {
    httpOnly: true,
    secure: true
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  const logoutToken = req.cookies.accessToken || req.body.accessToken;

  if (!logoutToken) {
    throw new ApiError(401, "Unauthorized request: No refresh token provided");
  }

  const decodedToken = jwt.verify(logoutToken, process.env.ACCESS_TOKEN_SECRET);
  console.log('Decoded Token:', decodedToken);

  await prisma.user.update({
    where: { id: decodedToken._id },
    data: { refreshToken: null},
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'Strict', 
  };

  res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken 

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: No refresh token provided");
  }

  try {
    const checkToken = await prisma.user.findFirst({
      where: { refreshToken: incomingRefreshToken }
    });

    if (!checkToken) {
      throw new ApiError(401, "Unauthorized request: Invalid refresh token");
    }

    console.log(checkToken);

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log('Decoded Token:', decodedToken);

    const user = await prisma.user.findUnique({
      where: { id: decodedToken._id }
    });

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token: User not found");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',

    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access Token Refreshed"));
  } catch (error) {
    console.error('Error refreshing access token:', error.message);
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

export { registerUser, loginUser, logoutUser, generateAccessAndRefreshTokens, refreshAccessToken };

