import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { deleteDeviceFn, getDeviceFn, updateDeviceFn } from "@/lib/devices";
import { DEVICE_MODELS } from "@/lib/format";
import { requireAdmin } from "@/lib/require-auth";

export const Route = createFileRoute("/devices/$id")({
  beforeLoad: requireAdmin,
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false as const, error: "Equipamento inválido" };
    }
    return getDeviceFn({ data: { id } });
  },
  head: () => ({
    meta: [{ title: "Edit Equipment — Âncora Access" }],
  }),
  component: EditDevice,
});

function EditDevice() {
  const loaded = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const device = loaded.ok ? loaded.device : null;
  const initialModel =
    DEVICE_MODELS.find((model) => model.id === device?.model) ?? DEVICE_MODELS[1]!;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof DEVICE_MODELS)[number]>(initialModel);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(loaded.ok ? null : loaded.error);
  const [port, setPort] = useState(String(device?.port ?? initialModel.defaultPort));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const fieldClass =
    "input-glow w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-sm pl-[40px] pr-md text-body-md text-on-surface outline-none transition-all focus:border-primary";

  if (!device) {
    return (
      <AppShell mobileTitle="Equipment">
        <main className="p-margin-mobile md:p-margin-desktop">
          <p className="rounded-lg bg-error-container px-sm py-sm text-on-error-container">
            {error || "Equipamento não encontrado"}
          </p>
          <Link to="/devices" className="mt-md inline-block text-label-md text-primary">
            Voltar
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell mobileTitle="Edit equipment">
      <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
        <div className="mb-lg">
          <div className="mb-xs flex items-center gap-xs text-label-md text-on-surface-variant">
            <Link to="/devices" className="hover:text-primary">
              Devices
            </Link>
            <Icon name="chevron_right" className="text-sm" />
            <span className="font-bold text-primary">Edit</span>
          </div>
          <h2 className="text-headline-lg tracking-tight text-primary">Edit Equipment</h2>
          <p className="mt-base text-body-md text-on-surface-variant">
            Altere rede, credenciais ou exclua o equipamento da suíte.
          </p>
        </div>

        <form
          className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            const password = String(form.get("devicePassword") ?? "");
            try {
              const result = await updateDeviceFn({
                data: {
                  id: device.id,
                  name: String(form.get("deviceName") ?? ""),
                  ip: String(form.get("ipAddress") ?? ""),
                  port: Number(form.get("port") ?? port),
                  username: String(form.get("deviceUser") ?? "admin"),
                  model: selected.id,
                  ...(password ? { password } : {}),
                  ...(String(form.get("location") ?? "").trim()
                    ? { location: String(form.get("location")).trim() }
                    : {}),
                },
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              await navigate({ to: "/devices" });
            } catch {
              setError("Não foi possível salvar o equipamento.");
            } finally {
              setPending(false);
            }
          }}
        >
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1 lg:col-span-8">
            <div className="space-y-lg p-lg">
              <div className="space-y-base">
                <label className="block text-label-md text-on-surface-variant" htmlFor="deviceName">
                  Device Name
                </label>
                <div className="relative">
                  <Icon name="badge" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    id="deviceName"
                    name="deviceName"
                    required
                    defaultValue={device.name}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="space-y-base">
                <label className="block text-label-md text-on-surface-variant" htmlFor="location">
                  Location
                </label>
                <div className="relative">
                  <Icon
                    name="location_on"
                    className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    id="location"
                    name="location"
                    defaultValue={device.location ?? ""}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="ipAddress">
                    IP Address
                  </label>
                  <div className="relative">
                    <Icon name="lan" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="ipAddress"
                      name="ipAddress"
                      required
                      defaultValue={device.ip}
                      className={`${fieldClass} font-mono`}
                    />
                  </div>
                </div>
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="port">
                    Port
                  </label>
                  <div className="relative">
                    <Icon
                      name="settings_input_component"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      id="port"
                      name="port"
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(event) => setPort(event.target.value)}
                      className={`${fieldClass} font-mono`}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="deviceUser">
                    Username
                  </label>
                  <div className="relative">
                    <Icon name="person" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="deviceUser"
                      name="deviceUser"
                      defaultValue={device.username}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="devicePassword">
                    Password
                  </label>
                  <div className="relative">
                    <Icon
                      name="password"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      id="devicePassword"
                      name="devicePassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Deixe em branco para manter"
                      className={`${fieldClass} pr-[40px]`}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
              {error ? (
                <p className="rounded-lg bg-error-container px-sm py-sm text-label-md text-on-error-container">
                  {error}
                </p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-gutter lg:col-span-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <span className="mb-base block text-label-md text-on-surface-variant">Model</span>
              <div className="relative" ref={containerRef}>
                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-lg border-2 border-secondary-container bg-surface-container-lowest py-sm pl-md pr-sm text-body-md font-bold text-primary"
                >
                  <span className="flex items-center gap-xs">
                    <Icon name={selected.icon} className="text-secondary" />
                    {selected.name}
                  </span>
                  <Icon name="expand_more" className="text-on-surface-variant" />
                </button>
                {open ? (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-elevation-1">
                    {DEVICE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelected(model);
                          setPort(String(model.defaultPort));
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-xs px-md py-sm text-left text-body-md hover:bg-surface-container-low"
                      >
                        <Icon name={model.icon} className="text-sm" />
                        {model.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              disabled={pending || deleting}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary disabled:opacity-70"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <Link
              to="/devices"
              className="flex h-12 w-full items-center justify-center rounded-lg border border-outline px-md text-sm font-semibold text-primary"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={pending || deleting}
              onClick={async () => {
                const confirmed = window.confirm(
                  `Excluir ${device.name} da suíte? O equipamento físico não é apagado.`,
                );
                if (!confirmed) return;
                setDeleting(true);
                setError(null);
                try {
                  const result = await deleteDeviceFn({ data: { id: device.id } });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  await router.navigate({ to: "/devices" });
                } finally {
                  setDeleting(false);
                }
              }}
              className="flex h-12 w-full items-center justify-center rounded-lg border border-error/30 bg-error-container px-md text-sm font-semibold text-on-error-container disabled:opacity-70"
            >
              {deleting ? "Excluindo…" : "Excluir equipamento"}
            </button>
          </aside>
        </form>
      </main>
    </AppShell>
  );
}
