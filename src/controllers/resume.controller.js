import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../../prisma/index.js";

// CREATE ENPOINT FOR RESUME
export const createResume = asyncHandler(async (req, res) => {
  const {
    userId,
    templateId,
    fullName,
    email,
    workingProfession,
    careerSummary,
    experience,
    education,
    skills,
    certification,
    projects,
    resumeName,
    phoneNumber,
  } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Ensure unique templateName for the user
  const existingTemplate = await prisma.resume.findFirst({
    where: {
      userId: user.id,
      templateName: resumeName,
    },
  });

  if (existingTemplate) {
    return res.status(400).json({ message: "Template name already exists" });
  }

  try {
    const createdResume = await prisma.$transaction(async (prisma) => {
      const resume = await prisma.resume.create({
        data: {
          user: {
            connect: { id: user?.id },
          },
          templateName: resumeName,
          templateId,
          fullName,
          email,
          phoneNumber,
          workingProfession,
          careerSummary,
          skills,

          experience: {
            create: experience.map((exp) => ({
              companyName: exp.companyName,
              jobTitle: exp.jobTitle,
              duration: exp.duration,
            })),
          },

          education: {
            create: education.map((edu) => ({
              boards: edu.university,
              degree: edu.degree,
              graduatedYear: edu.graduationYear,
            })),
          },

          certifications: {
            create: certification.map((cert) => ({
              name: cert.name,
              issuer: cert.issuedBy,
              dateIssued: new Date(cert.issueDate),
              deployedUrl: cert.deployedLink || null,
            })),
          },

          projects: {
            create: projects.map((proj) => ({
              title: proj.name,
              description: proj.description,
              link: proj.deployedLink || null,
              techStack: proj.technologies,
            })),
          },

          conversation: {
            create: [],
          },
        },
        include: {
          experience: true,
          education: true,
          certifications: true,
          projects: true,
          conversation: true,
        },
      });

      return resume;
    });

    res.status(201).json({
      message: "Resume created successfully",
      data: createdResume,
    });
  } catch (error) {
    console.error("Error creating resume:", error);
    res.status(500).json({ message: "Failed to create resume" });
  }
});

// UPDATE ENPOINT FOR RESUME
export const updateResume = asyncHandler(async (req, res) => {
  const {
    resumeId,
    userId,
    fullName,
    email,
    phoneNumber,
    workingProfession,
    careerSummary,
    skills,
    experience,
    education,
    certification,
    projects,
    resumeName,
  } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const existingResume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!existingResume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  if (resumeName && resumeName !== existingResume.templateName) {
    const templateExists = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        templateName: resumeName,
      },
    });

    if (templateExists) {
      return res.status(400).json({ message: "Template name already exists" });
    }
  }

  try {
    const updatedResume = await prisma.$transaction(async (prisma) => {
      const resume = await prisma.resume.update({
        where: { id: resumeId },
        data: {
          templateName: resumeName || existingResume.templateName,
          fullName,
          email,
          phoneNumber,
          workingProfession,
          careerSummary,
          skills,
          updatedAt: new Date(),

          experience: {
            deleteMany: {},
          },
          education: {
            deleteMany: {},
          },
          certifications: {
            deleteMany: {},
          },
          projects: {
            deleteMany: {},
          },
        },
      });
      if (experience?.length > 0) {
        for (const exp of experience) {
          await prisma.experience.create({
            data: {
              resumeId: resume.id,
              companyName: exp.companyName,
              jobTitle: exp.jobTitle,
              duration: exp.duration,
            },
          });
        }
      }
      if (education?.length > 0) {
        for (const edu of education) {
          await prisma.education.create({
            data: {
              resumeId: resume.id,
              boards: edu.university,
              degree: edu.degree,
              graduatedYear: edu.graduationYear,
            },
          });
        }
      }
      if (certification?.length > 0) {
        for (const cert of certification) {
          await prisma.certification.create({
            data: {
              resumeId: resume.id,
              name: cert.name,
              issuer: cert.issuedBy,
              dateIssued: new Date(cert.issueDate),
              deployedUrl: cert.deployedLink || null,
            },
          });
        }
      }
      if (projects?.length > 0) {
        for (const proj of projects) {
          await prisma.project.create({
            data: {
              resumeId: resume.id,
              title: proj.name,
              description: proj.description,
              link: proj.deployedLink || null,
              techStack: proj.technologies,
            },
          });
        }
      }

      return resume;
    });

    res.status(200).json({
      message: "Resume updated successfully",
      data: updatedResume,
    });
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).json({ message: "Failed to update resume" });
  }
});

// READ BY ID ENPOINT FOR RESUME
export const getResumeById = asyncHandler(async (req, res) => {});

// READ ALL ENPOINT FOR RESUME
export const getAllResume = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const resumes = await prisma.resume.findMany({
    where: {
      userId: user?.id,
    },
    include: {
      experience: true,
      education: true,
      certifications: true,
      projects: true,
      conversation: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!resumes || resumes.length === 0) {
    return res.status(200).json({ message: "No resumes found for this user" });
  }

  res.status(200).json({ resumes });
});

// DELETE ENPOINT FOR RESUME
export const deleteResumeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Resume ID is required" });
  }

  const existingResume = await prisma.resume.findUnique({
    where: { id },
  });

  if (!existingResume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  await prisma.resume.delete({
    where: { id },
  });

  res.status(200).json({ message: "Resume deleted successfully" });
});

// READ UNIQUE ENPOINT FOR RESUME
export const uniqueResumeTemplateName = asyncHandler(async (req, res) => {
  const { userId, templateName } = req.body;

  if (!userId || !templateName) {
    return res.status(400).json({ error: "Template name are required" });
  }

  const existingResume = await prisma.resume.findFirst({
    where: {
      userId: userId,
      templateName: templateName,
    },
  });

  if (existingResume) {
    return res.status(409).json({ message: "Template name already exists" });
  }

  return res.status(200).json({ message: "Template name is unique" });
});
