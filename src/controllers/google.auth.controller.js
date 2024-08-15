import { generateAccessAndRefreshTokens } from "../controllers/user.controller.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';



const loadAuth = (req, res) => {
    res.render('auth');
}

const successGoogleLogin = async (req, res) => {
  if (!req.user) {
    throw new ApiError(404, 'User not found');
  }

  // Generate JWT tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user.id);

  // Set options for secure and HTTP-only cookies
  const options = {
    httpOnly: true,
    secure: true
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)  // Updated from cookieOptions to options
    .cookie("refreshToken", refreshToken, options)  // Updated from cookieOptions to options
    .json(new ApiResponse(200, { user: req.user, accessToken, refreshToken }, "User logged in successfully"));
};


const failureGoogleLogin = (req, res) => { 
  throw new ApiError(404, 'User not found');
}

const protectedRoute = (req , res ) => {
  res.send("this is protected route")
}

export {
    loadAuth,
    successGoogleLogin,
    failureGoogleLogin,
    protectedRoute
}
