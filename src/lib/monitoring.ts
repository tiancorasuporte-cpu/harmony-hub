import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function optionalInt(min: number, max: number) {
  return z
    .union([z.number(), z.string(), z.undefined(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return undefined;
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(n) || n < min || n > max) return undefined;
      return n;
    });
}

const presenceFilterSchema = z.object({
  year: optionalInt(2000, 2100),
  month: optionalInt(1, 12),
  day: optionalInt(1, 31),
  page: optionalInt(1, 100000),
});

export const listPresenceFn = createServerFn({ method: "GET" })
  .validator((input) => presenceFilterSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { ensureAccessLogPoller } = await import("@/server/sync");
    const { listPresence, listRecentAccessEvents, countFilteredAccessEvents, backfillAccessEventGuests } =
      await import("@/db/events");
    ensureAccessLogPoller();
    await backfillAccessEventGuests().catch(() => undefined);
    const pageSize = 10;
    const eventTotal = await countFilteredAccessEvents({
      year: data.year,
      month: data.month,
      day: data.day,
    });
    const pageCount = Math.max(1, Math.ceil(eventTotal / pageSize));
    const page = Math.min(data.page ?? 1, pageCount);
    return {
      people: await listPresence(),
      events: await listRecentAccessEvents({
        limit: pageSize,
        page,
        year: data.year,
        month: data.month,
        day: data.day,
      }),
      eventTotal,
      eventPage: page,
      eventPageCount: pageCount,
      eventPageSize: pageSize,
    };
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
