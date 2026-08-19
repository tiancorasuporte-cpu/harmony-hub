import { compare, hash } from "bcryptjs";

import { getDb, type AppRole, type AppUser, type AppUserRow } from "./schema";

function toRole(value: string | null | undefined): AppRole {
  if (value === "superadmin") return "superadmin";
  if (value === "admin") return "admin";
  return "porteiro";
}

function toPublicUser(row: AppUserRow & { hotel_id?: number | null; hotel_name?: string | null }): AppUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: toRole(row.role),
    active: row.active,
    hotelId: row.hotel_id ?? null,
    hotelName: row.hotel_name ?? null,
  };
}

export async function findUserByUsername(username: string, hotelId: number | null) {
  const db = await getDb();
  const rows =
    hotelId == null
      ? await db<AppUserRow[]>`
          select id, username, password_hash, name, role, active
          from users
          where username = ${username} and hotel_id is null
          limit 1
        `
      : await db<AppUserRow[]>`
          select id, username, password_hash, name, role, active
          from users
          where username = ${username} and hotel_id = ${hotelId}
          limit 1
        `;
  return rows[0];
}

export async function findUserById(id: number, opts?: { includeInactive?: boolean }): Promise<AppUser | undefined> {
  const db = await getDb();
  const rows = opts?.includeInactive
    ? await db<(AppUserRow & { hotel_id: number | null; hotel_name: string | null })[]>`
        select u.id, u.username, u.password_hash, u.name, u.role, u.active, u.hotel_id, h.name as hotel_name
        from users u
        left join hotels h on h.id = u.hotel_id
        where u.id = ${id}
        limit 1
      `
    : await db<(AppUserRow & { hotel_id: number | null; hotel_name: string | null })[]>`
        select u.id, u.username, u.password_hash, u.name, u.role, u.active, u.hotel_id, h.name as hotel_name
        from users u
        left join hotels h on h.id = u.hotel_id
        where u.id = ${id} and u.active = true
        limit 1
      `;
  const row = rows[0];
  return row ? toPublicUser(row) : undefined;
}

export async function authenticateUser(
  username: string,
  password: string,
  hotelId: number | null,
): Promise<AppUser | undefined> {
  const user = await findUserByUsername(username, hotelId);
  if (!user || !user.active) return undefined;

  const matches = await compare(password, user.password_hash);
  if (!matches) return undefined;

  return findUserById(user.id);
}

export async function listUsers(hotelId: number): Promise<AppUser[]> {
  const db = await getDb();
  const rows = await db<(AppUserRow & { hotel_id: number | null; hotel_name: string | null })[]>`
    select u.id, u.username, u.password_hash, u.name, u.role, u.active, u.hotel_id, h.name as hotel_name
    from users u
    left join hotels h on h.id = u.hotel_id
    where u.hotel_id = ${hotelId}
    order by u.name
  `;
  return rows.map(toPublicUser);
}

export async function createUser(input: {
  username: string;
  password: string;
  name: string;
  role: Exclude<AppRole, "superadmin">;
  hotelId: number;
}): Promise<AppUser> {
  const db = await getDb();
  const passwordHash = await hash(input.password, 10);
  const rows = await db<AppUserRow[]>`
    insert into users (username, password_hash, name, role, active, hotel_id)
    values (${input.username}, ${passwordHash}, ${input.name}, ${input.role}, true, ${input.hotelId})
    returning id, username, password_hash, name, role, active
  `;
  const row = rows[0];
  if (!row) throw new Error("Não foi possível criar o usuário");
  const loaded = await findUserById(row.id);
  if (!loaded) throw new Error("Não foi possível criar o usuário");
  return loaded;
}

export async function countActiveAdmins(hotelId: number) {
  const db = await getDb();
  const rows = await db<{ count: number }[]>`
    select count(*)::int as count
    from users
    where role = 'admin' and active = true and hotel_id = ${hotelId}
  `;
  return rows[0]?.count ?? 0;
}

export async function setUserActive(id: number, active: boolean) {
  const db = await getDb();
  await db`update users set active = ${active}, updated_at = now() where id = ${id}`;
}

export async function updateUserProfile(id: number, name: string, password?: string) {
  const db = await getDb();
  if (password) {
    const passwordHash = await hash(password, 10);
    await db`
      update users
      set name = ${name}, password_hash = ${passwordHash}, updated_at = now()
      where id = ${id}
    `;
    return;
  }
  await db`update users set name = ${name}, updated_at = now() where id = ${id}`;
}
