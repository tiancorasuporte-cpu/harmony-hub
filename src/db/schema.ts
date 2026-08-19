import "@tanstack/react-start/server-only";
import { hash } from "bcryptjs";

import { getSql } from "./client";

export type AppRole = "superadmin" | "admin" | "porteiro";

export type AppUser = {
  id: number;
  username: string;
  name: string;
  role: AppRole;
  active: boolean;
  hotelId: number | null;
  hotelName: string | null;
};

export type AppUserRow = AppUser & {
  password_hash: string;
};

let ready: Promise<void> | undefined;

export function resetSchemaReady() {
  ready = undefined;
}

export async function getDb() {
  if (!ready) {
    ready = ensureSchema().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
  return getSql();
}

async function tableExists(name: string) {
  const sql = getSql();
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = ${name}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(table: string, column: string) {
  const sql = getSql();
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = ${table} and column_name = ${column}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function indexExists(name: string) {
  const sql = getSql();
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from pg_indexes where schemaname = 'public' and indexname = ${name}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function addColumn(table: string, column: string, definition: string) {
  if (await columnExists(table, column)) return;
  const sql = getSql();
  await sql.unsafe(`alter table ${table} add column if not exists ${column} ${definition}`);
}

async function columnDataType(table: string, column: string) {
  const sql = getSql();
  const rows = await sql<{ data_type: string }[]>`
    select data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = ${table} and column_name = ${column}
  `;
  return rows[0]?.data_type ?? null;
}

async function ensureTimestamptz(table: string, column: string) {
  const type = await columnDataType(table, column);
  if (type !== "timestamp without time zone") return;
  const sql = getSql();
  await sql.unsafe(
    `alter table ${table} alter column ${column} type timestamptz using ${column} at time zone 'America/Sao_Paulo'`,
  );
}

async function ensureBigint(table: string, column: string) {
  const type = await columnDataType(table, column);
  if (type !== "integer") return;
  const sql = getSql();
  await sql.unsafe(`alter table ${table} alter column ${column} type bigint`);
}

async function dropConstraint(table: string, name: string) {
  const sql = getSql();
  await sql.unsafe(`alter table ${table} drop constraint if exists ${name}`);
}

export async function ensureSchema() {
  const sql = getSql();

  if (!(await tableExists("users"))) {
    await sql`
      create table users (
        id serial primary key,
        username varchar(64) not null unique,
        password_hash text not null,
        name varchar(120) not null,
        role varchar(32) not null default 'operator',
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
  }

  if (!(await tableExists("guests"))) {
    await sql`
      create table guests (
        id serial primary key,
        name varchar(120) not null,
        cpf varchar(14) not null,
        room varchar(32),
        check_in timestamptz default current_timestamp,
        control_id_user_id bigint
      )
    `;
  }

  await addColumn("guests", "kind", "varchar(16) not null default 'guest'");
  await addColumn("guests", "department", "varchar(80)");
  await addColumn("guests", "photo", "bytea");
  await addColumn("guests", "photo_mime", "varchar(64)");
  await addColumn("guests", "active", "boolean not null default true");
  await addColumn("guests", "check_out", "timestamptz");
  await ensureTimestamptz("guests", "check_in");
  await ensureTimestamptz("guests", "check_out");
  await addColumn("guests", "updated_at", "timestamptz not null default now()");
  await addColumn("guests", "document_type", "varchar(16) not null default 'cpf'");
  await addColumn("guests", "room_type", "varchar(32)");
  await addColumn("guests", "target_all", "boolean not null default true");
  if (await columnExists("guests", "cpf")) {
    await sql.unsafe("alter table guests alter column cpf type varchar(32)");
  }

  if (!(await tableExists("devices"))) {
    await sql`
      create table devices (
        id serial primary key,
        name varchar(120) not null,
        model varchar(64) not null default 'idface_max',
        location varchar(120),
        ip varchar(64) not null,
        port integer not null default 80,
        use_https boolean not null default false,
        username varchar(64) not null default 'admin',
        password text not null,
        serial varchar(80),
        firmware varchar(80),
        hardware_id varchar(80),
        last_seen_at timestamptz,
        last_sync_at timestamptz,
        last_error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (ip, port)
      )
    `;
  }

  if (!(await tableExists("device_people"))) {
    await sql`
      create table device_people (
        id serial primary key,
        device_id integer not null references devices(id) on delete cascade,
        guest_id integer not null references guests(id) on delete cascade,
        control_id_user_id bigint not null,
        face_synced boolean not null default false,
        last_sync_at timestamptz,
        last_error text,
        unique (device_id, guest_id),
        unique (device_id, control_id_user_id)
      )
    `;
  }

  if (!(await tableExists("device_sync_state"))) {
    await sql`
      create table device_sync_state (
        device_id integer primary key references devices(id) on delete cascade,
        last_access_log_id bigint not null default 0,
        ancora_group_id bigint,
        ancora_rule_id bigint
      )
    `;
  }

  if (!(await tableExists("access_events"))) {
    await sql`
      create table access_events (
        id serial primary key,
        device_id integer not null references devices(id) on delete cascade,
        guest_id integer references guests(id) on delete set null,
        control_id_log_id bigint not null,
        control_id_user_id bigint,
        event_code integer not null,
        occurred_at timestamptz not null,
        portal_id integer,
        confidence integer,
        created_at timestamptz not null default now(),
        unique (device_id, control_id_log_id)
      )
    `;
  }

  if (!(await indexExists("access_events_occurred_at_idx"))) {
    await sql.unsafe(
      "create index access_events_occurred_at_idx on access_events (occurred_at desc)",
    );
  }
  if (!(await indexExists("access_events_guest_id_idx"))) {
    await sql.unsafe(
      "create index access_events_guest_id_idx on access_events (guest_id, occurred_at desc)",
    );
  }

  if (!(await tableExists("guest_devices"))) {
    await sql`
      create table guest_devices (
        guest_id integer not null references guests(id) on delete cascade,
        device_id integer not null references devices(id) on delete cascade,
        primary key (guest_id, device_id)
      )
    `;
  }

  await ensureBigint("guests", "control_id_user_id");
  await ensureBigint("device_people", "control_id_user_id");
  await ensureBigint("access_events", "control_id_user_id");

  await ensureHotels(sql);

  const username = process.env["APP_ADMIN_USERNAME"] ?? "admin";
  const password = process.env["APP_ADMIN_PASSWORD"] ?? "admin";
  const name = process.env["APP_ADMIN_NAME"] ?? "Administrator";

  const principal = await sql<{ id: number }[]>`
    select id from hotels order by id limit 1
  `;
  const hotelId = principal[0]?.id;
  if (hotelId) {
    const existing = await sql<{ id: number }[]>`
      select id from users
      where username = ${username} and hotel_id = ${hotelId}
      limit 1
    `;
    if (!existing[0]) {
      const passwordHash = await hash(password, 10);
      await sql`
        insert into users (username, password_hash, name, role, hotel_id)
        values (${username}, ${passwordHash}, ${name}, 'admin', ${hotelId})
      `;
    }
  }

  const superUsername = process.env["APP_SUPERADMIN_USERNAME"] ?? "superadmin";
  const superPassword = process.env["APP_SUPERADMIN_PASSWORD"] ?? "ancora";
  const superName = process.env["APP_SUPERADMIN_NAME"] ?? "Âncora";
  const superExisting = await sql<{ id: number }[]>`
    select id from users where username = ${superUsername} and hotel_id is null limit 1
  `;
  if (!superExisting[0]) {
    const passwordHash = await hash(superPassword, 10);
    await sql`
      insert into users (username, password_hash, name, role, hotel_id)
      values (${superUsername}, ${passwordHash}, ${superName}, 'superadmin', null)
    `;
  }
}

async function ensureHotels(sql: Awaited<ReturnType<typeof getSql>>) {
  if (!(await tableExists("hotels"))) {
    await sql`
      create table hotels (
        id serial primary key,
        name varchar(120) not null,
        slug varchar(64) not null,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (slug)
      )
    `;
  }

  let principal = await sql<{ id: number }[]>`select id from hotels order by id limit 1`;
  if (!principal[0]) {
    principal = await sql<{ id: number }[]>`
      insert into hotels (name, slug, active)
      values ('Hotel principal', 'principal', true)
      returning id
    `;
  }
  const hotelId = principal[0]!.id;

  await addColumn("users", "hotel_id", "integer references hotels(id)");
  await addColumn("guests", "hotel_id", "integer references hotels(id)");
  await addColumn("devices", "hotel_id", "integer references hotels(id)");

  await sql`update users set hotel_id = ${hotelId} where hotel_id is null and role <> 'superadmin'`;
  await sql`update guests set hotel_id = ${hotelId} where hotel_id is null`;
  await sql`update devices set hotel_id = ${hotelId} where hotel_id is null`;

  try {
    await sql.unsafe("alter table guests alter column hotel_id set not null");
  } catch {
    // Column may already be required.
  }
  try {
    await sql.unsafe("alter table devices alter column hotel_id set not null");
  } catch {
    // Column may already be required.
  }

  await dropConstraint("users", "users_username_key");
  await dropConstraint("devices", "devices_ip_port_key");

  if (!(await indexExists("users_hotel_username_idx"))) {
    await sql.unsafe(
      "create unique index users_hotel_username_idx on users (hotel_id, username) where hotel_id is not null",
    );
  }
  if (!(await indexExists("users_superadmin_username_idx"))) {
    await sql.unsafe(
      "create unique index users_superadmin_username_idx on users (username) where hotel_id is null",
    );
  }
  if (!(await indexExists("devices_hotel_ip_port_idx"))) {
    await sql.unsafe("create unique index devices_hotel_ip_port_idx on devices (hotel_id, ip, port)");
  }
  if (!(await indexExists("guests_hotel_id_idx"))) {
    await sql.unsafe("create index guests_hotel_id_idx on guests (hotel_id)");
  }
}
