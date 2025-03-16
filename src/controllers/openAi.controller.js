import prisma from "../../prisma/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import OpenAI from "openai";
import { writeFile, readFile } from "fs/promises";
import multer from "multer";
import { Buffer } from "buffer";

const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const encodeImage = async (imagePath) => {
  try {
    const imageBuffer = await readFile(imagePath); // Read the image file
    return Buffer.from(imageBuffer).toString("base64"); // Convert to base64
  } catch (error) {
    throw new ApiError(500, "Failed to encode image to base64");
  }
};

const generatePrompt = (resumeData, userInput) => {
  const uniqueId = `resume-${Date.now()}`;
  const bgColor = resumeData.colors || "#ffffff";
  const headerFooterTextColor = resumeData.colors ? "#ffffff" : "#000000";
  
  return `
    You are an expert in generating professional, responsive HTML resumes with inline CSS. 
    Generate a clean, modern, and visually appealing resume using only HTML with inline styles (<header>, <section>, <footer>). 

    - Use background color **${bgColor}** for header and footer.
    - Set text color for **header and footer** to **${headerFooterTextColor}**.
    - Set text color for **sections** to **black** (#000000).
    - Include:
      - **Name:** ${resumeData.fullName || ""}
      - **Email:** ${resumeData.email || ""}
      - **Phone:** ${resumeData.phoneNumber || ""}
      - **Profession:** ${resumeData.workingProfession || ""}
      - **Summary:** ${resumeData.careerSummary || ""}
      - **Skills:** ${resumeData.skills?.join(", ") || ""}
      ${
        resumeData.experience?.length
          ? `- **Experience:** ` +
            resumeData.experience
              .map(
                (exp) =>
                  `${exp.jobTitle} at ${exp.companyName} (${exp.duration})`
              )
              .join("; ")
          : ""
      }
      ${
        resumeData.education?.length
          ? `- **Education:** ` +
            resumeData.education
              .map(
                (edu) => `${edu.degree} at ${edu.boards} (${edu.graduatedYear})`
              )
              .join("; ")
          : ""
      }
      ${
        resumeData.projects?.length
          ? `- **Projects:** ` +
            resumeData.projects
              .map(
                (proj) =>
                  `${proj.title} (${proj.link || "N/A"}) [${
                    proj.techStack || "N/A"
                  }]`
              )
              .join("; ")
          : ""
      }
      ${
        resumeData.certifications?.length
          ? `- **Certifications:** ` +
            resumeData.certifications
              .map(
                (cert) =>
                  `${cert.name} by ${cert.issuer} (${new Date(
                    cert.dateIssued
                  ).toDateString()})`
              )
              .join("; ")
          : ""
      }

    - Prefix all IDs and classes with '${uniqueId}-' for uniqueness.
    - Wrap the entire resume in a container with ID '${uniqueId}-container'.

    User Command: ${userInput}

    Ensure the HTML output is **well-structured and readable**, following accessibility best practices.
  `;
};


const generateResume = async (req, res, next, withTemplate) => {
  const { resumeId, userInput, assistantResponse, color } = req.body;

  if (!userInput) return next(new ApiError(400, "userInput is required"));

  await prisma.$transaction([
    prisma.conversation.create({
      data: { resumeId, role: "user", message: userInput },
    }),
    prisma.conversation.create({
      data: { resumeId, role: "assistant", message: assistantResponse },
    }),
  ]);

  if (color) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        colors: color,
      },
    });
  }

  const resumeData = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: {
      experience: true,
      education: true,
      projects: true,
      certifications: true,
      conversation: true,
    },
  });

  if (!resumeData) {
    return next(new ApiError(404, "Resume not found"));
  }

  const prompt = generatePrompt(resumeData, userInput);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userInput },
      ],
      max_tokens: 3000, // Lower max tokens to save cost
      temperature: 0.6, // Balanced creativity and consistency
    });

    let htmlResult = completion.choices[0].message.content
      .replace(/^```html/, "") // Remove starting ```html
      .replace(/```$/, ""); // Remove ending ```


    await prisma.resume.update({
      where: { id: resumeId },
      data: { jsonHtmlCode: htmlResult },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, htmlResult, "Resume generated successfully"));
  } catch (error) {
    console.error("Error generating resume:", error);
    return next(new ApiError(500, "Failed to generate HTML resume"));
  }
};

const createHtmlTemplate = asyncHandler(async (req, res, next) => {
  await generateResume(req, res, next, false);
});

const createHtmlWithTemplate = asyncHandler(async (req, res, next) => {
  await generateResume(req, res, next, true);
});

const convertImageToHtml = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, "No image file uploaded");
  }

  try {
    // Encode the image to base64
    const base64Image = await encodeImage(req.file.path);

    // Send the image to the ChatGPT API with vision capabilities
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use the latest vision-capable model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
                You are an expert in converting images of resume templates into pixel-perfect HTML and CSS code.
                Below is an image of a resume template. Convert it into an exact HTML replica of the image, including all colors, fonts, alignments, and visual details.

                Requirements:
                1. **Exact Replica**:
                   - Replicate the exact structure, colors, fonts, and layout of the image.
                   - Use inline CSS for all styles to ensure pixel-perfect accuracy.
                2. **Colors**:
                   - Use the exact hex codes or RGB values for all colors (backgrounds, text, borders, etc.).
                3. **Fonts**:
                   - Use the exact font families and sizes as seen in the image.
                   - If the font is not available, use a close alternative and mention it in the comments.
                4. **Alignment**:
                   - Ensure all elements (text, images, sections) are aligned exactly as in the image.
                   - Use CSS properties like \`text-align\`, \`margin\`, \`padding\`, and \`flexbox\` to achieve this.
                5. **Sections**:
                   - Include all sections from the image (e.g., Name, Contact Information, About Me, Experience, Education, Skills, Projects).
                   - Use semantic HTML tags like \`<header>\`, \`<section>\`, and \`<footer>\`.
                6. **Responsiveness**:
                   - Ensure the layout is responsive and adapts to different screen sizes.
                7. **Comments**:
                   - Add comments in the HTML code to explain the purpose of each section and style.

                Return only the HTML code with inline CSS. Do not include any extra lines, explanations, or markdown.
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096, // Adjust based on the expected output size
    });

    // Extract the generated HTML code
    const htmlCode = response.choices[0].message.content.trim();

    const editedhtmlCode = htmlCode
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Save the generated HTML to a file (optional)
    await writeFile("generated-resume.html", editedhtmlCode);

    // Send the HTML code as a response
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { editedhtmlCode },
          "HTML code generated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to convert image to HTML");
  }
});

const changeSelectText = asyncHandler(async (req, res) => {});

export { createHtmlTemplate, createHtmlWithTemplate, convertImageToHtml };
