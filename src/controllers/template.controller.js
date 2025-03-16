import prisma from "../../prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const SaveTemplate = asyncHandler(async(req , res)=>{
const { id ,clerk_id  ,htmlJson } = req.body;



})