import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const bootstrapSchema = z.object({
  tenantName: z.string().trim().min(1, "Informe o nome da empresa"),
  tenantSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens"),
  adminEmail: z.email("Email inválido"),
  adminPassword: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

export type BootstrapFormValues = z.infer<typeof bootstrapSchema>;
