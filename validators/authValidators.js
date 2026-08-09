const { z } = require("zod");

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name cannot exceed 50 characters")
    .trim(),
  email: z
    .string()
    .email("Please add a valid email")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(12, "Password cannot exceed 12 characters"),
});

const loginSchema = z.object({
  email: z
    .string()
    .email("Please add a valid email")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name cannot exceed 50 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Please add a valid email")
    .toLowerCase()
    .trim()
    .optional(),
  affiliation: z
    .string()
    .max(100, "Affiliation cannot exceed 100 characters")
    .trim()
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(12, "Password cannot exceed 12 characters"),
});

const confirmPictureSchema = z.object({
  versionId: z.string().min(1, "Version id cannot be empty").max(64).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  confirmPictureSchema,
};
