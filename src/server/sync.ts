import "@tanstack/react-start/server-only";

import { getDeviceById, listDevices, type DeviceRow } from "@/db/devices";
import { getSyncCursor, insertAccessEvents, saveSyncCursor, backfillAccessEventGuests } from "@/db/events";
import {
  findPersonIdByDeviceUser,
  findPersonIdByRegistration,
  listDevicePeople,
  listDevicePeopleByGuest,
  listGuestDeviceIds,
  listPeopleForSync,
  markFaceRevoked,
  deleteDevicePersonMapping,
  setGuestDevices,
  setPersonTargetAll,
  upsertDevicePerson,
  type PersonRow,
} from "@/db/people";
import { isCheckedOut, isInStay, stayWindow, toDeviceUnix } from "@/lib/stay";
import {
  addUserToGroup,
  destroyUser,
  ensureAccessPolicy,
  findOrCreateUser,
  findUsersByRegistration,
  loadAccessLogs,
  setUserImage,
  toControlIdId,
  type DeviceEndpoint,
} from "@/server/control-id";

function asEndpoint(device: DeviceRow): DeviceEndpoint {
  return {
    ip: device.ip,
    port: device.port,
    useHttps: device.use_https,
    username: device.username,
    password: device.password,
  };
}

function asBuffer(photo: Uint8Array | Buffer | null): Buffer | null {
  if (!photo) return null;
  return Buffer.isBuffer(photo) ? photo : Buffer.from(photo);
}

async function targetDevicesFor(person: PersonRow) {
  const all = await listDevices();
  if (person.target_all !== false) return all;
  const ids = await listGuestDeviceIds(person.id);
  return all.filter((device) => ids.includes(device.id));
}

function userTimes(person: PersonRow) {
  const { start, end } = stayWindow(person.check_in, person.check_out);
  return {
    beginTime: start ? toDeviceUnix(start) : undefined,
    endTime: end ? toDeviceUnix(end) : undefined,
  };
}

export async function enrollPersonOnDevice(person: PersonRow, device: DeviceRow) {
  const endpoint = asEndpoint(device);
  const policy = await ensureAccessPolicy(endpoint);
  await saveSyncCursor(device.id, { groupId: policy.groupId, ruleId: policy.ruleId });
  const times = userTimes(person);

  const userId = await findOrCreateUser(endpoint, {
    name: person.name,
    registration: person.cpf,
    ...(times.beginTime ? { beginTime: times.beginTime } : {}),
    ...(times.endTime ? { endTime: times.endTime } : {}),
  });
  if (policy.groupId) {
    await addUserToGroup(endpoint, userId, policy.groupId);
  }

  let faceSynced = false;
  let photoError: string | null = null;
  const photo = asBuffer(person.photo);
  if (photo && photo.length > 0) {
    try {
      await setUserImage(endpoint, userId, photo);
      faceSynced = true;
    } catch (error) {
      photoError = error instanceof Error ? error.message : "Foto rejeitada";
    }
  }

  await upsertDevicePerson({
    deviceId: device.id,
    guestId: person.id,
    controlIdUserId: userId,
    faceSynced,
    lastError: photoError,
  });

  if (photoError) throw new Error(photoError);
  return { userId, faceSynced };
}

export async function revokePersonOnDevice(person: PersonRow, device: DeviceRow) {
  const endpoint = asEndpoint(device);
  const mappings = await listDevicePeopleByGuest(person.id);
  const mapping = mappings.find((item) => item.device_id === device.id);
  const ids = new Set<number>();
  const mappedId = toControlIdId(mapping?.control_id_user_id);
  if (mappedId) ids.add(mappedId);

  const matches = await findUsersByRegistration(endpoint, person.cpf);
  for (const user of matches) ids.add(user.id);

  for (const userId of ids) {
    await destroyUser(endpoint, userId).catch(() => undefined);
  }

  const remaining = await findUsersByRegistration(endpoint, person.cpf);
  if (remaining.length > 0) {
    throw new Error("O Face Max não removeu este usuário. Confira a conexão com o equipamento.");
  }

  await markFaceRevoked(device.id, person.id);
}

export async function removePersonEverywhere(person: PersonRow) {
  const devices = await targetDevicesFor(person);
  const mappings = await listDevicePeopleByGuest(person.id);
  const extra = (await listDevices()).filter((device) =>
    mappings.some((item) => item.device_id === device.id),
  );
  const unique = new Map<number, DeviceRow>();
  for (const device of [...devices, ...extra]) unique.set(device.id, device);
  for (const device of unique.values()) {
    await revokePersonOnDevice(person, device);
  }
}

export async function syncPersonToDevice(person: PersonRow, deviceId: number) {
  const device = await getDeviceById(deviceId);
  if (!device) throw new Error("Equipamento não encontrado");
  if (person.target_all === false) {
    const ids = await listGuestDeviceIds(person.id);
    if (!ids.includes(deviceId)) await setGuestDevices(person.id, [...ids, deviceId]);
  }
  return enrollPersonOnDevice(person, device);
}

export async function removePersonFromDevice(person: PersonRow, deviceId: number) {
  const device = await getDeviceById(deviceId);
  if (!device) throw new Error("Equipamento não encontrado");
  await revokePersonOnDevice(person, device);
  await deleteDevicePersonMapping(deviceId, person.id);
  const all = await listDevices();
  if (person.target_all !== false) {
    await setPersonTargetAll(person.id, false);
    await setGuestDevices(
      person.id,
      all.filter((item) => item.id !== deviceId).map((item) => item.id),
    );
  } else {
    const ids = (await listGuestDeviceIds(person.id)).filter((id) => id !== deviceId);
    await setGuestDevices(person.id, ids);
  }
}

export async function revokePersonFromUntargeted(person: PersonRow) {
  const targets = await targetDevicesFor(person);
  const mappings = await listDevicePeopleByGuest(person.id);
  const all = await listDevices();
  for (const mapping of mappings) {
    if (targets.some((device) => device.id === mapping.device_id)) continue;
    const device = all.find((item) => item.id === mapping.device_id);
    if (device) {
      await revokePersonOnDevice(person, device);
      await deleteDevicePersonMapping(device.id, person.id);
    }
  }
}

export async function processStayWindows() {
  const people = await listPeopleForSync();
  const enrolled: string[] = [];
  const revoked: string[] = [];
  const errors: string[] = [];

  for (const person of people) {
    const devices = await targetDevicesFor(person);
    const inStay = isInStay(person.check_in, person.check_out);
    try {
      if (inStay) {
        if (!asBuffer(person.photo)) continue;
        const mappings = await listDevicePeopleByGuest(person.id);
        for (const device of devices) {
          const already = mappings.find((item) => item.device_id === device.id)?.face_synced;
          if (already) {
            const times = userTimes(person);
            await findOrCreateUser(asEndpoint(device), {
              name: person.name,
              registration: person.cpf,
              ...(times.beginTime ? { beginTime: times.beginTime } : {}),
              ...(times.endTime ? { endTime: times.endTime } : {}),
            }).catch(() => undefined);
            continue;
          }
          await enrollPersonOnDevice(person, device);
        }
        enrolled.push(person.name);
      } else if (isCheckedOut(person.check_out)) {
        const mappings = await listDevicePeopleByGuest(person.id);
        const mappedDevices = mappings.length
          ? (await listDevices()).filter((device) => mappings.some((item) => item.device_id === device.id))
          : devices;
        for (const device of mappedDevices) {
          await revokePersonOnDevice(person, device);
        }
        if (mappings.some((item) => item.face_synced)) revoked.push(person.name);
      }
    } catch (error) {
      errors.push(`${person.name}: ${error instanceof Error ? error.message : "erro"}`);
    }
  }

  return { enrolled, revoked, errors };
}

export async function syncDevice(deviceId: number) {
  const device = await getDeviceById(deviceId);
  if (!device) throw new Error("Equipamento não encontrado");

  const people = await listPeopleForSync();
  let users = 0;
  let faces = 0;
  const errors: string[] = [];

  for (const person of people) {
    const targets = await targetDevicesFor(person);
    if (!targets.some((item) => item.id === deviceId)) continue;
    try {
      if (isInStay(person.check_in, person.check_out)) {
        const result = await enrollPersonOnDevice(person, device);
        users += 1;
        if (result.faceSynced) faces += 1;
      } else if (isCheckedOut(person.check_out)) {
        await revokePersonOnDevice(person, device);
      }
    } catch (error) {
      errors.push(`${person.name}: ${error instanceof Error ? error.message : "erro"}`);
    }
  }

  const logs = await pullAccessLogs(deviceId, asEndpoint(device));
  return { users, faces, logs, errors };
}

export async function pullAccessLogs(deviceId: number, endpoint?: DeviceEndpoint) {
  const device = endpoint ? null : await getDeviceById(deviceId);
  if (!endpoint) {
    if (!device) return 0;
  }
  const conn = endpoint ?? asEndpoint(device!);
  const cursor = await getSyncCursor(deviceId);
  const revisitFrom = cursor.lastAccessLogId > 0 ? Math.max(0, cursor.lastAccessLogId - 250) : 0;
  const logs = await loadAccessLogs(conn, revisitFrom);
  if (logs.length === 0) {
    await backfillAccessEventGuests();
    return 0;
  }

  const mappings = await listDevicePeople(deviceId);
  const byUserId = new Map(
    mappings.map((item) => [String(Number(item.control_id_user_id)), Number(item.guest_id)]),
  );
  const byRegistration = new Map<string, number>();

  async function resolveGuestId(userId: number | null, registration?: string) {
    if (userId) {
      const cached = byUserId.get(String(userId));
      if (cached) return cached;
      const found = await findPersonIdByDeviceUser(deviceId, userId);
      if (found) {
        byUserId.set(String(userId), found);
        return found;
      }
    }
    const digits = (registration ?? "").replace(/\D/g, "");
    if (digits.length >= 5) {
      const cached = byRegistration.get(digits);
      if (cached) return cached;
      const found = await findPersonIdByRegistration(digits);
      if (found) {
        byRegistration.set(digits, found);
        return found;
      }
    }
    return null;
  }

  const events = [];
  for (const log of logs) {
    const userId = log.user_id ? Number(log.user_id) : 0;
    const unix = Number(log.time) || 0;
    const occurredAt = unix > 1e12 ? new Date(unix) : new Date(unix * 1000);
    events.push({
      deviceId,
      guestId: await resolveGuestId(userId || null, log.registration),
      controlIdLogId: Number(log.id),
      controlIdUserId: userId || null,
      eventCode: Number(log.event) || 0,
      occurredAt,
      portalId: log.portal_id ?? null,
      confidence: log.confidence ?? null,
    });
  }

  await insertAccessEvents(events);
  await backfillAccessEventGuests();

  const maxId = Math.max(cursor.lastAccessLogId, ...logs.map((log) => Number(log.id)));
  if (maxId > cursor.lastAccessLogId) {
    await saveSyncCursor(deviceId, { lastAccessLogId: maxId });
  }
  return logs.length;
}

export async function pullAllDeviceLogs() {
  const devices = await listDevices();
  const counts = await Promise.all(
    devices.map((device) => pullAccessLogs(device.id, asEndpoint(device)).catch(() => 0)),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

type PollerGlobal = typeof globalThis & {
  __ancoraAccessLogPoller?: ReturnType<typeof setInterval>;
  __ancoraAccessLogPulling?: boolean;
  __ancoraAccessLogPullStarted?: number;
};

export async function pollAccessLogsOnce() {
  const g = globalThis as PollerGlobal;
  const started = g.__ancoraAccessLogPullStarted ?? 0;
  if (g.__ancoraAccessLogPulling && Date.now() - started < 12_000) return;
  g.__ancoraAccessLogPulling = true;
  g.__ancoraAccessLogPullStarted = Date.now();
  try {
    await pullAllDeviceLogs();
  } catch {
    // Device or DB may be unavailable during setup.
  } finally {
    g.__ancoraAccessLogPulling = false;
  }
}

export function ensureAccessLogPoller() {
  const g = globalThis as PollerGlobal;
  if (g.__ancoraAccessLogPoller) return;
  g.__ancoraAccessLogPoller = setInterval(() => {
    void pollAccessLogsOnce();
  }, 1000);
  void pollAccessLogsOnce();
}
