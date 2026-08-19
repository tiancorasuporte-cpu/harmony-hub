import { createServerFn } from "@tanstack/react-start";

export const listPresenceFn = createServerFn({ method: "GET" }).handler(async () => {
  const { pullAllDeviceLogs, processStayWindows } = await import("@/server/sync");
  const { listPresence } = await import("@/db/events");
  await processStayWindows().catch(() => undefined);
  await pullAllDeviceLogs();
  return listPresence();
});

export const getOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const { countDevices } = await import("@/db/devices");
  const { countPeople } = await import("@/db/people");
  const { countAccessEvents, listPresence } = await import("@/db/events");
  const presence = await listPresence();
  return {
    devices: await countDevices(),
    people: await countPeople(),
    events: await countAccessEvents(),
    active: presence.filter((item) => item.status === "Active").length,
  };
});
