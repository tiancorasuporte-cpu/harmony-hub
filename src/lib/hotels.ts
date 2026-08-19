import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createHotelSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do hotel"),
  adminName: z.string().trim().min(2, "Informe o nome do administrador"),
  adminUsername: z.string().trim().min(2, "Informe o usuário"),
  adminPassword: z.string().min(4, "A senha deve ter pelo menos 4 caracteres"),
});

export const listHotelsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSuperadminSession } = await import("@/lib/tenant");
  await requireSuperadminSession();
  const { listHotels, hotelStats } = await import("@/db/hotels");
  const hotels = await listHotels();
  return Promise.all(
    hotels.map(async (hotel) => ({
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      active: hotel.active,
      ...(await hotelStats(hotel.id)),
    })),
  );
});

export const createHotelFn = createServerFn({ method: "POST" })
  .validator(createHotelSchema)
  .handler(async ({ data }) => {
    const { requireSuperadminSession } = await import("@/lib/tenant");
    await requireSuperadminSession();
    try {
      const { createHotel } = await import("@/db/hotels");
      const hotel = await createHotel(data);
      return { ok: true as const, hotel };
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "23505") {
        return { ok: false as const, error: "Já existe um hotel ou usuário com esses dados." };
      }
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Não foi possível criar o hotel",
      };
    }
  });

export const setHotelActiveFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive(), active: z.boolean() }))
  .handler(async ({ data }) => {
    const { requireSuperadminSession } = await import("@/lib/tenant");
    await requireSuperadminSession();
    const { setHotelActive } = await import("@/db/hotels");
    await setHotelActive(data.id, data.active);
    return { ok: true as const };
  });
