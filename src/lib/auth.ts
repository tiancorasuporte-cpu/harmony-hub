import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
  hotelSlug: z.string().trim().optional(),
});

const invalidLogin = { ok: false as const, error: "Código, usuário ou senha inválidos." };

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const { isDatabaseConfigured } = await import("@/db/client");
    if (!isDatabaseConfigured()) {
      return { ok: false as const, error: "Configure o banco de dados antes de entrar." };
    }
    const { authenticateUser } = await import("@/db/users");
    const { getHotelBySlug } = await import("@/db/hotels");
    const { getAuthSession } = await import("@/server/session");

    const slug = data.hotelSlug?.trim() ?? "";
    let hotelId: number | null = null;

    if (slug) {
      const hotel = await getHotelBySlug(slug);
      if (!hotel?.active) return invalidLogin;
      hotelId = hotel.id;
    }

    const user = await authenticateUser(data.username, data.password, hotelId);
    if (!user) return invalidLogin;
    if (hotelId == null && user.role !== "superadmin") return invalidLogin;
    if (hotelId != null && user.role === "superadmin") return invalidLogin;

    const session = await getAuthSession();
    await session.update({
      userId: user.id,
      hotelId,
    });
    return { ok: true as const, user, hotelId };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getAuthSession } = await import("@/server/session");
  const session = await getAuthSession();
  await session.clear();
  return { ok: true as const };
});

export const enterHotelFn = createServerFn({ method: "POST" })
  .validator(z.object({ hotelId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { requireSuperadminSession } = await import("@/lib/tenant");
    const { getHotelById } = await import("@/db/hotels");
    const { getAuthSession } = await import("@/server/session");
    await requireSuperadminSession();
    const hotel = await getHotelById(data.hotelId);
    if (!hotel) return { ok: false as const, error: "Hotel não encontrado." };
    const session = await getAuthSession();
    const userId = session.data.userId;
    if (typeof userId !== "number") return { ok: false as const, error: "Sessão expirada." };
    await session.update({
      userId,
      hotelId: hotel.id,
    });
    return { ok: true as const };
  });

export const leaveHotelFn = createServerFn({ method: "POST" }).handler(async () => {
  const { requireSuperadminSession } = await import("@/lib/tenant");
  const { getAuthSession } = await import("@/server/session");
  await requireSuperadminSession();
  const session = await getAuthSession();
  const userId = session.data.userId;
  if (typeof userId !== "number") return { ok: false as const };
  await session.update({
    userId,
    hotelId: null,
  });
  return { ok: true as const };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { isDatabaseConfigured } = await import("@/db/client");
  if (!isDatabaseConfigured()) return null;
  const { getSessionContext } = await import("@/lib/tenant");
  const { user } = await getSessionContext();
  return user;
});
