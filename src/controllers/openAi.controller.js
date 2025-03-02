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

const generatePrompt = (isDark, withTemplate) => {
  const uniqueId = `resume-${Date.now()}`; // Generate a unique identifier

  return `
      You are an expert in generating professional, responsive HTML resumes with inline CSS. 
      Generate a clean, modern, and visually appealing resume using only HTML with inline styles.
      
      - The resume should have a **${
        isDark ? "dark" : "light"
      }** theme with a ${
    isDark ? "dark" : "light"
  } background and contrasting text.
      - Use **semantic HTML** (e.g., <header>, <section>, <footer>) and organize content properly.
      - Apply **inline CSS** for styling, including modern fonts, soft shadows, subtle accent colors, and responsive design.
      - The layout should be **mobile-friendly**, adapting for different screen sizes without external CSS or media queries.
      - Include sections for:
        - **Name & Contact Information**
        - **About Me**
        - **Experience**
        - **Education**
        - **Skills**
        ${
          withTemplate
            ? "- **Projects (Include GitHub links if provided)**"
            : ""
        }
      
      Important Requirements:
      - **All class names and IDs must be prefixed with '${uniqueId}-'** to ensure uniqueness.
      - The resume should not affect or override other components when embedded in a page.
      - The entire resume should be wrapped in a parent container with the ID **'${uniqueId}-container'**.
  
      Ensure the HTML output is **well-structured and readable**, following accessibility best practices.
    `;
};

const generateResume = async (req, res, next, withTemplate) => {
  // add next parameter
  const { userInput, IsDark } = req.body;
  if (!userInput) return next(new ApiError(400, "userInput is required")); // use return next

  const themePrompt = generatePrompt(IsDark, withTemplate);
  const schema = withTemplate
    ? {
        jobtitle: { type: "string" },
        aboutme: { type: "string" },
        experience: { type: "string" },
        education: { type: "string" },
        skills: { type: "string" },
        projects: { type: "string", description: "GitHub links if provided" },
      }
    : { html: { type: "string" } };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: themePrompt },
        { role: "user", content: userInput },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_schema",
          schema: {
            type: "object",
            properties: schema,
            additionalProperties: false,
          },
        },
      },
    });

    await writeFile(
      "test.html",
      JSON.parse(completion.choices[0].message.content).html
    );

    const result = JSON.parse(completion.choices[0].message.content);
    res
      .status(200)
      .json(new ApiResponse(200, result, "Resume generated successfully"));
  } catch (error) {
    return next(new ApiError(500, "Failed to generate HTML resume")); // use return next
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

const changeSelectText = asyncHandler(async (req, res)=>{


});

export { createHtmlTemplate, createHtmlWithTemplate, convertImageToHtml };
