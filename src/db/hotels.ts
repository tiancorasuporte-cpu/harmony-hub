import { hash } from "bcryptjs";

import { getDb } from "./schema";

export type HotelRow = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || `hotel-${Date.now()}`;
}

export async function listHotels() {
  const db = await getDb();
  return db<HotelRow[]>`select * from hotels order by name`;
}

export async function listActiveHotels() {
  const db = await getDb();
  return db<HotelRow[]>`select * from hotels where active = true order by name`;
}

export async function getHotelById(id: number) {
  const db = await getDb();
  const rows = await db<HotelRow[]>`select * from hotels where id = ${id} limit 1`;
  return rows[0];
}

export async function getHotelBySlug(slug: string) {
  const db = await getDb();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;
  const rows = await db<HotelRow[]>`
    select * from hotels where slug = ${normalized} limit 1
  `;
  return rows[0];
}

export async function createHotel(input: {
  name: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
}) {
  const db = await getDb();
  const base = slugify(input.name);
  let slug = base;
  for (let index = 2; index < 50; index += 1) {
    const taken = await db<{ id: number }[]>`select id from hotels where slug = ${slug} limit 1`;
    if (!taken[0]) break;
    slug = `${base}-${index}`;
  }

  const rows = await db<HotelRow[]>`
    insert into hotels (name, slug, active)
    values (${input.name.trim()}, ${slug}, true)
    returning *
  `;
  const hotel = rows[0];
  if (!hotel) throw new Error("Não foi possível criar o hotel");

  const passwordHash = await hash(input.adminPassword, 10);
  await db`
    insert into users (username, password_hash, name, role, hotel_id, active)
    values (${input.adminUsername.trim()}, ${passwordHash}, ${input.adminName.trim()}, 'admin', ${hotel.id}, true)
  `;
  return hotel;
}

export async function setHotelActive(id: number, active: boolean) {
  const db = await getDb();
  await db`update hotels set active = ${active}, updated_at = now() where id = ${id}`;
}

export async function hotelStats(hotelId: number) {
  const db = await getDb();
  const users = await db<{ count: number }[]>`
    select count(*)::int as count from users where hotel_id = ${hotelId} and active = true
  `;
  const devices = await db<{ count: number }[]>`
    select count(*)::int as count from devices where hotel_id = ${hotelId}
  `;
  const people = await db<{ count: number }[]>`
    select count(*)::int as count from guests where hotel_id = ${hotelId} and active = true
  `;
  return {
    users: users[0]?.count ?? 0,
    devices: devices[0]?.count ?? 0,
    people: people[0]?.count ?? 0,
  };
}
