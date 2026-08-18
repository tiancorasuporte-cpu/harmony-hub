import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/devices/")({
  head: () => ({
    meta: [
      { title: "Device Monitoring — Âncora Access" },
      {
        name: "description",
        content:
          "Real-time status of every access control endpoint: online state, IP address and last sync.",
      },
      { property: "og:title", content: "Device Monitoring — Âncora Access" },
      {
        property: "og:description",
        content: "Real-time status of all access control endpoints in the Âncora network.",
      },
    ],
  }),
  component: Devices,
});

type Device = {
  id: string;
  name: string;
  icon: string;
  online: boolean;
  location: string;
  locationIcon: string;
  ip: string;
  lastSync: string;
};

const DEVICES: Device[] = [
  {
    id: "DEV-1042",
    name: "Control ID Face MAX",
    icon: "dns",
    online: true,
    location: "Main Entrance",
    locationIcon: "location_on",
    ip: "192.168.1.101",
    lastSync: "2 mins ago",
  },
  {
    id: "DEV-2015",
    name: "Control ID iFace",
    icon: "sensors_off",
    online: false,
    location: "Pool Side Gate",
    locationIcon: "pool",
    ip: "192.168.1.145",
    lastSync: "45 mins ago",
  },
  {
    id: "DEV-0891",
    name: "HID Signo 40",
    icon: "sensor_door",
    online: true,
    location: "Staff Entrance",
    locationIcon: "meeting_room",
    ip: "192.168.1.112",
    lastSync: "Just now",
  },
];

function Devices() {
  return (
    <AppShell mobileTitle="Devices">
      <main className="flex-1">
        <header className="sticky top-0 z-20 border-b border-outline-variant bg-background/90 px-margin-mobile py-lg backdrop-blur-md md:px-margin-desktop">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Device Monitoring</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Real-time status of all access control endpoints.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2">
                <div className="flex flex-col">
                  <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                    Total Devices
                  </span>
                  <span className="text-title-lg text-primary">24</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-success" />
                <div className="flex flex-col">
                  <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                    Online
                  </span>
                  <span className="text-title-lg text-primary">22</span>
                </div>
              </div>
              <Link
                to="/devices/register"
                className="flex items-center gap-xs self-center rounded-lg bg-primary px-md py-sm text-label-md font-bold text-on-primary transition-colors hover:bg-primary-container"
              >
                <Icon name="add" className="text-sm" />
                Register Equipment
              </Link>
            </div>
          </div>
        </header>

        <div className="p-margin-mobile md:p-margin-desktop">
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2 xl:grid-cols-3">
            {DEVICES.map((device) => (
              <article
                key={device.id}
                className="group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-shadow hover:shadow-elevation-1"
              >
                {!device.online && (
                  <div className="pointer-events-none absolute inset-0 bg-error-container/30" />
                )}
                <div className="relative z-10 mb-md flex items-start justify-between border-b border-outline-variant/50 pb-sm">
                  <div className="flex items-center gap-sm">
                    <Icon
                      name={device.icon}
                      filled
                      className={
                        device.online
                          ? "rounded-lg bg-surface-container-high p-2 text-primary transition-colors group-hover:bg-secondary-container"
                          : "rounded-lg bg-error-container p-2 text-error"
                      }
                    />
                    <div>
                      <h3 className="text-title-lg text-primary">{device.name}</h3>
                      <p className="text-label-md text-on-surface-variant">ID: {device.id}</p>
                    </div>
                  </div>
                  <div
                    className={
                      device.online
                        ? "flex items-center gap-1.5 rounded-full border border-success/30 bg-success-container px-2 py-1 text-on-success-container"
                        : "flex items-center gap-1.5 rounded-full border border-error/30 bg-error-container px-2 py-1 text-on-error-container"
                    }
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${device.online ? "bg-success" : "bg-error"}`}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {device.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className={`relative z-10 space-y-sm ${device.online ? "" : "opacity-70"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-label-md text-on-surface-variant">Location</span>
                    <span className="flex items-center gap-1 text-body-md font-medium text-primary">
                      <Icon name={device.locationIcon} className="text-sm text-on-surface-variant" />
                      {device.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-label-md text-on-surface-variant">IP Address</span>
                    <span
                      className={`rounded bg-surface-container px-2 py-0.5 font-mono text-sm text-primary ${
                        device.online ? "" : "text-on-surface-variant line-through"
                      }`}
                    >
                      {device.ip}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-label-md text-on-surface-variant">Last Sync</span>
                    <span
                      className={
                        device.online
                          ? "text-body-md text-primary"
                          : "text-body-md font-medium text-error"
                      }
                    >
                      {device.lastSync}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 mt-md flex justify-end gap-2 pt-sm">
                  {device.online ? (
                    <>
                      <button className="rounded border border-outline-variant bg-surface-container-high px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-highest">
                        Details
                      </button>
                      <button className="rounded border border-primary bg-surface-container-lowest px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-high">
                        Restart
                      </button>
                    </>
                  ) : (
                    <button className="flex items-center gap-1 rounded bg-error px-3 py-1.5 text-label-md text-on-error transition-all hover:brightness-90">
                      <Icon name="warning" className="text-[16px]" />
                      Investigate
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
