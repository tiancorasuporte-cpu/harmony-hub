import { getDb } from "./schema";

export const ACCESS_GRANTED = 7;

export type AccessEventInsert = {
  deviceId: number;
  guestId: number | null;
  controlIdLogId: number;
  controlIdUserId: number | null;
  eventCode: number;
  occurredAt: Date;
  portalId: number | null;
  confidence: number | null;
};

export type PresencePerson = {
  id: number;
  name: string;
  kind: "guest" | "staff";
  role: string;
  status: "Active" | "Inactive";
  since: string | null;
  hasPhoto: boolean;
  lastDevice: string | null;
  lastEventCode: number | null;
};

export async function getSyncCursor(deviceId: number) {
  const db = await getDb();
  const rows = await db<{ last_access_log_id: string | number; ancora_group_id: string | number | null; ancora_rule_id: string | number | null }[]>`
    select last_access_log_id, ancora_group_id, ancora_rule_id
    from device_sync_state
    where device_id = ${deviceId}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    await db`
      insert into device_sync_state (device_id) values (${deviceId})
      on conflict (device_id) do nothing
    `;
    return { lastAccessLogId: 0, groupId: null as number | null, ruleId: null as number | null };
  }
  return {
    lastAccessLogId: Number(row.last_access_log_id) || 0,
    groupId: row.ancora_group_id == null ? null : Number(row.ancora_group_id),
    ruleId: row.ancora_rule_id == null ? null : Number(row.ancora_rule_id),
  };
}

export async function saveSyncCursor(
  deviceId: number,
  patch: { lastAccessLogId?: number; groupId?: number | null; ruleId?: number | null },
) {
  const db = await getDb();
  await db`
    insert into device_sync_state (device_id, last_access_log_id, ancora_group_id, ancora_rule_id)
    values (
      ${deviceId},
      ${patch.lastAccessLogId ?? 0},
      ${patch.groupId ?? null},
      ${patch.ruleId ?? null}
    )
    on conflict (device_id) do update set
      last_access_log_id = coalesce(${patch.lastAccessLogId ?? null}, device_sync_state.last_access_log_id),
      ancora_group_id = coalesce(${patch.groupId ?? null}, device_sync_state.ancora_group_id),
      ancora_rule_id = coalesce(${patch.ruleId ?? null}, device_sync_state.ancora_rule_id)
  `;
}

export async function insertAccessEvents(events: AccessEventInsert[]) {
  if (events.length === 0) return;
  const db = await getDb();
  for (const event of events) {
    await db`
      insert into access_events (
        device_id, guest_id, control_id_log_id, control_id_user_id,
        event_code, occurred_at, portal_id, confidence
      )
      values (
        ${event.deviceId},
        ${event.guestId},
        ${event.controlIdLogId},
        ${event.controlIdUserId},
        ${event.eventCode},
        ${event.occurredAt},
        ${event.portalId},
        ${event.confidence}
      )
      on conflict (device_id, control_id_log_id) do nothing
    `;
  }
}

export async function listPresence(now = new Date()): Promise<PresencePerson[]> {
  const db = await getDb();
  const rows = await db<
    {
      id: number;
      name: string;
      kind: string;
      room: string | null;
      department: string | null;
      has_photo: boolean;
      last_access_at: Date | null;
      last_event_code: number | null;
      last_device: string | null;
    }[]
  >`
    select
      g.id,
      g.name,
      g.kind,
      g.room,
      g.department,
      (g.photo is not null) as has_photo,
      last_evt.occurred_at as last_access_at,
      last_evt.event_code as last_event_code,
      last_evt.device_name as last_device
    from guests g
    left join lateral (
      select e.occurred_at, e.event_code, d.name as device_name
      from access_events e
      join devices d on d.id = e.device_id
      where e.guest_id = g.id
      order by e.occurred_at desc
      limit 1
    ) last_evt on true
    where g.active = true
    order by
      case when last_evt.occurred_at is null then 1 else 0 end,
      last_evt.occurred_at desc nulls last,
      g.name
  `;

  const activeWindowMs = 18 * 60 * 60 * 1000;

  return rows.map((row) => {
    const kind = row.kind === "staff" ? "staff" : "guest";
    const role =
      kind === "staff"
        ? `Staff${row.department ? ` • ${row.department}` : ""}`
        : `Guest${row.room ? ` • Room ${row.room}` : ""}`;
    const last = row.last_access_at ? row.last_access_at.getTime() : 0;
    const isActive =
      row.last_event_code === ACCESS_GRANTED && last > 0 && now.getTime() - last < activeWindowMs;

    return {
      id: row.id,
      name: row.name,
      kind,
      role,
      status: isActive ? "Active" : "Inactive",
      since: row.last_access_at ? row.last_access_at.toISOString() : null,
      hasPhoto: row.has_photo,
      lastDevice: row.last_device,
      lastEventCode: row.last_event_code,
    };
  });
}

export async function countAccessEvents() {
  const db = await getDb();
  const rows = await db<{ count: number }[]>`select count(*)::int as count from access_events`;
  return rows[0]?.count ?? 0;
}
