import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/monitoring")({
  head: () => ({
    meta: [
      { title: "Active Presence — Âncora Access" },
      {
        name: "description",
        content:
          "See who is currently on premises across all zones, with check-in times for guests and staff.",
      },
      { property: "og:title", content: "Active Presence — Âncora Access" },
      {
        property: "og:description",
        content: "Live on-premise presence for guests and staff across every zone.",
      },
    ],
  }),
  component: Monitoring,
});

type Person = {
  name: string;
  role: string;
  status: "Active" | "Inactive";
  since: string;
  photo?: string;
};

const PEOPLE: Person[] = [
  {
    name: "Marcus Vance",
    role: "Guest • Room 402",
    status: "Active",
    since: "Today, 14:30",
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDL5gQk8N759HLsIKSlpZpkLZABF5_LK7NzvC2I4jwrYRxIKtKHUUrsXLPSRONaBVyIRsdZxTLUYJoeChuHAIFZebwKiaS5Ew2VhMEgVu-RVk91z-9vMk-HbZQG5X8OCaDBP_uYBKl1PK2DsXkeH6IsXhfgR1nPhSZRj0m_uxSvJ_ELcjLXsF7fx3Rl6k6euTE7UiQH9KZmUEj8pkDPvcUdkLlDVJP0UV1AEERYFtaHgIPSu35BBK4HVg",
  },
  { name: "Sarah Jenkins", role: "Staff • Maintenance", status: "Inactive", since: "Yesterday, 08:00" },
  {
    name: "Elena Rodriguez",
    role: "VIP Guest • Penthouse",
    status: "Active",
    since: "Today, 10:15",
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCm83nNdj3wMHpl0mvnj_c8cH4XvUDGQMEYo_7HPGlyzBsJOFjnTaGHCDLEegKHEWhHopeHn-OfbpRRIJzBsfoHe8ZPsfEpWaJYGfLUTDH9-lVgFUvj6lomzLSbh4CWtBRZGaxqw1wNsj-kQBlz_f5dxy_3_kvOggNJ4_ZNtolTlBcvANSZ_XHzpRo5Hq_zy42IAnmpVyIGQzIfDKMa4tUU7DyEqxmjQ39ibcVnnrxzKAmd6Um8fdPvPg",
  },
  {
    name: "David Kim",
    role: "Staff • Security",
    status: "Active",
    since: "Today, 06:00",
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDsOX9gtN4HWeinHjvdgV8488DgT2o7C2OVfv_UIrCfFQTXrQRRcnoK7X-AUmidU8VmjkPjkqFYdCcfiqd1j7lrw852fV1MbnzzyOb6H8-HTs7USuD1wIXME9mI9o9wNsYfxHA446ns4089fpABosOALhDY4EGdsM-NlFKbw5EQBtqZ5R2PIjPyfcjbTSAlnfQjDcZQ9WFySj78J2JZ-eGkziYWC6ApDl9GpNnBRaQPrZU-yGKAwXhJ8g",
  },
];

function Monitoring() {
  return (
    <AppShell mobileTitle="Presence" searchPlaceholder="Search people, rooms, or roles...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-7xl space-y-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Active Presence</h2>
              <p className="mt-base text-body-lg text-on-surface-variant">
                Currently on premises across all zones.
              </p>
            </div>
            <div className="flex gap-sm">
              <button className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md transition-colors hover:bg-surface-container-high">
                <Icon name="filter_list" className="text-sm" />
                Filter
              </button>
              <button className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md transition-colors hover:bg-surface-container-high">
                <Icon name="download" className="text-sm" />
                Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PEOPLE.map((person) => (
              <article
                key={person.name}
                className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-shadow hover:shadow-elevation-1"
              >
                <div className="flex items-start justify-between">
                  {person.photo ? (
                    <img
                      src={person.photo}
                      alt={person.name}
                      loading="lazy"
                      className="h-12 w-12 rounded-full border border-outline-variant object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high">
                      <Icon name="person" className="text-on-surface-variant" />
                    </div>
                  )}
                  <span
                    className={
                      person.status === "Active"
                        ? "rounded-full bg-success-container px-xs py-base text-label-md text-on-success-container"
                        : "rounded-full bg-surface-variant px-xs py-base text-label-md text-on-surface-variant"
                    }
                  >
                    {person.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-title-lg text-on-surface">{person.name}</h3>
                  <p className="text-body-md text-on-surface-variant">{person.role}</p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-surface-variant pt-sm text-on-surface-variant">
                  <div className="flex items-center gap-xs text-label-md">
                    <Icon name="login" className="text-[16px]" />
                    {person.since}
                  </div>
                  <button
                    aria-label={`More actions for ${person.name}`}
                    className="text-primary transition-colors hover:text-secondary"
                  >
                    <Icon name="more_horiz" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
