import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, useShellSearch } from "@/components/AppShell";
import { FilterChips, MobileSearch } from "@/components/FilterBar";
import { Icon } from "@/components/Icon";
import { listDevicesFn, deleteDeviceFn, openDeviceDoorFn, restartDeviceFn, syncDeviceFn } from "@/lib/devices";
import { formatRelative, modelIcon, modelLabel } from "@/lib/format";
import { requireAdmin } from "@/lib/require-auth";
import { matchesQuery } from "@/lib/text-search";

export const Route = createFileRoute("/devices/")({
  beforeLoad: requireAdmin,
  loader: () => listDevicesFn(),
  head: () => ({
    meta: [
      { title: "Device Monitoring — Âncora Access" },
      {
        name: "description",
        content:
          "Real-time status of every access control endpoint: online state, IP address and last sync.",
      },
    ],
  }),
  component: Devices,
});

function Devices() {
  const devices = Route.useLoaderData();
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { query } = useShellSearch();
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const visible = useMemo(() => {
    return devices.filter((device) => {
      if (statusFilter === "online" && !device.online) return false;
      if (statusFilter === "offline" && device.online) return false;
      return matchesQuery(query, [
        device.name,
        device.location,
        device.ip,
        device.port,
        device.serial,
        device.firmware,
        modelLabel(device.model),
        device.model,
      ]);
    });
  }, [devices, query, statusFilter]);

  const online = devices.filter((device) => device.online).length;

  async function run(id: number, action: "sync" | "restart" | "open" | "delete") {
    setBusyId(id);
    setMessage(null);
    try {
      if (action === "delete") {
        const device = devices.find((item) => item.id === id);
        const confirmed = window.confirm(
          `Excluir ${device?.name ?? "este equipamento"} da suíte? O Face Max físico não é apagado.`,
        );
        if (!confirmed) return;
        const result = await deleteDeviceFn({ data: { id } });
        setMessage(result.ok ? "Equipamento excluído." : result.error);
      } else if (action === "sync") {
        const result = await syncDeviceFn({ data: { id } });
        setMessage(
          result.ok
            ? `Sync: ${result.users} users, ${result.faces} faces, ${result.logs} logs`
            : result.error,
        );
      } else if (action === "restart") {
        const result = await restartDeviceFn({ data: { id } });
        setMessage(result.ok ? "Restart command sent." : result.error);
      } else {
        const result = await openDeviceDoorFn({ data: { id } });
        setMessage(result.ok ? "Door release sent." : result.error);
      }
      await router.invalidate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell mobileTitle="Devices" searchPlaceholder="Buscar nome, IP, local ou modelo...">
      <main className="flex-1">
        <header className="sticky top-0 z-20 border-b border-outline-variant bg-background/90 px-margin-mobile py-lg backdrop-blur-md md:px-margin-desktop">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Device Monitoring</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Control iD Face Max and other endpoints on the Âncora network.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2">
                <div className="flex flex-col">
                  <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                    Total Devices
                  </span>
                  <span className="text-title-lg text-primary">{devices.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-success" />
                <div className="flex flex-col">
                  <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                    Online
                  </span>
                  <span className="text-title-lg text-primary">{online}</span>
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
          {message ? (
            <p className="mt-md rounded-lg bg-surface-container-high px-sm py-sm text-label-md text-primary">
              {message}
            </p>
          ) : null}
        </header>

        <div className="p-margin-mobile md:p-margin-desktop">
          <div className="mb-lg space-y-sm">
            <MobileSearch placeholder="Buscar nome, IP, local ou modelo..." />
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { id: "all", label: "Todos" },
                { id: "online", label: "Online" },
                { id: "offline", label: "Offline" },
              ]}
            />
          </div>
          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center">
              <Icon name="key_visualizer" className="mb-sm text-4xl text-on-surface-variant" />
              <h3 className="text-title-lg text-primary">No equipment yet</h3>
              <p className="mt-base text-body-md text-on-surface-variant">
                Register a Control iD Face Max to start syncing guests and access events.
              </p>
              <Link
                to="/devices/register"
                className="mt-md inline-flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-label-md font-bold text-on-primary"
              >
                Register Equipment
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center text-on-surface-variant">
              Nenhum equipamento com esses filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((device) => (
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
                        name={modelIcon(device.model)}
                        filled
                        className={
                          device.online
                            ? "rounded-lg bg-surface-container-high p-2 text-primary transition-colors group-hover:bg-secondary-container"
                            : "rounded-lg bg-error-container p-2 text-error"
                        }
                      />
                      <div>
                        <h3 className="text-title-lg text-primary">{device.name}</h3>
                        <p className="text-label-md text-on-surface-variant">
                          {modelLabel(device.model)}
                          {device.serial ? ` • ${device.serial}` : ""}
                        </p>
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
                        <Icon name="location_on" className="text-sm text-on-surface-variant" />
                        {device.location || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-md text-on-surface-variant">IP Address</span>
                      <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-sm text-primary">
                        {device.ip}:{device.port}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-md text-on-surface-variant">Last Sync</span>
                      <span
                        className={
                          device.online ? "text-body-md text-primary" : "text-body-md font-medium text-error"
                        }
                      >
                        {formatRelative(device.lastSyncAt)}
                      </span>
                    </div>
                    {device.firmware ? (
                      <div className="flex items-center justify-between">
                        <span className="text-label-md text-on-surface-variant">Firmware</span>
                        <span className="text-body-md text-primary">{device.firmware}</span>
                      </div>
                    ) : null}
                    {device.lastError && !device.online ? (
                      <p className="text-xs text-error">{device.lastError}</p>
                    ) : null}
                  </div>

                  <div className="relative z-10 mt-md flex flex-wrap justify-end gap-2 pt-sm">
                    <Link
                      to="/devices/$id"
                      params={{ id: String(device.id) }}
                      className="rounded border border-outline-variant bg-surface-container-high px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-highest"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === device.id}
                      onClick={() => run(device.id, "delete")}
                      className="rounded border border-error/30 bg-error-container px-3 py-1.5 text-label-md text-on-error-container transition-colors hover:brightness-95 disabled:opacity-60"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      disabled={busyId === device.id}
                      onClick={() => run(device.id, "sync")}
                      className="rounded border border-outline-variant bg-surface-container-high px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-highest disabled:opacity-60"
                    >
                      Sync
                    </button>
                    {device.online ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === device.id}
                          onClick={() => run(device.id, "open")}
                          className="rounded border border-outline-variant bg-surface-container-high px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-highest disabled:opacity-60"
                        >
                          Open door
                        </button>
                        <button
                          type="button"
                          disabled={busyId === device.id}
                          onClick={() => run(device.id, "restart")}
                          className="rounded border border-primary bg-surface-container-lowest px-3 py-1.5 text-label-md text-primary transition-colors hover:bg-surface-container-high disabled:opacity-60"
                        >
                          Restart
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === device.id}
                        onClick={() => router.invalidate()}
                        className="flex items-center gap-1 rounded bg-error px-3 py-1.5 text-label-md text-on-error transition-all hover:brightness-90"
                      >
                        <Icon name="warning" className="text-[16px]" />
                        Retry
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
