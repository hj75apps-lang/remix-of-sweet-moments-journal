import { z } from "zod";

export const customStationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da rádio").max(80),
  url: z.string().trim().url("Endereço inválido").max(500).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  }, "Use um endereço https:// sem usuário ou senha"),
  frequency: z.string().trim().max(12).regex(/^$|^\d{2,4}([.,]\d)?\s*(FM|AM)?$/i, "Ex.: 106.7 FM"),
  city: z.string().trim().max(60),
  state: z.string().trim().max(40),
});