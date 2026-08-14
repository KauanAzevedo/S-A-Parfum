import { z } from "zod";
export const cartInput=z.object({productId:z.string().min(1),quantity:z.number().int().min(1).max(10)});
export const checkoutInput=z.object({name:z.string().min(3),cpf:z.string().min(11).max(14),phone:z.string().min(10),email:z.string().email(),zipCode:z.string().min(8),street:z.string().min(3),number:z.string().min(1),complement:z.string().optional(),district:z.string().min(2),city:z.string().min(2),state:z.string().length(2)});
