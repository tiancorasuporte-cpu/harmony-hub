import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { registerDeviceFn } from "@/lib/devices";
import { DEVICE_MODELS } from "@/lib/format";
import { requireAdmin } from "@/lib/require-auth";

export const Route = createFileRoute("/devices/register")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Cadastrar equipamento — Âncora Access" },
      {
        name: "description",
        content:
          "Provision a new physical access control device into the Âncora network with network settings and credentials.",
      },
    ],
  }),
  component: RegisterDevice,
});

function RegisterDevice() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof DEVICE_MODELS)[number]>(DEVICE_MODELS[1]!);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [port, setPort] = useState(String(DEVICE_MODELS[1]!.defaultPort));
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

  return (
    <AppShell mobileTitle="Cadastro">
      <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
        <div className="mb-lg w-full">
          <div className="mb-xs flex items-center gap-xs text-label-md text-on-surface-variant">
            <Icon name="key_visualizer" className="text-sm" />
            <Link to="/devices" className="hover:text-primary">
              Equipamentos
            </Link>
            <Icon name="chevron_right" className="text-sm" />
            <span className="font-bold text-primary">Cadastro</span>
          </div>
          <h2 className="text-headline-lg tracking-tight text-primary md:text-display-lg">
            Cadastrar equipamento
          </h2>
          <p className="mt-base w-full text-body-lg text-on-surface-variant">
            A suíte entra na API Control iD, grava o equipamento e sincroniza hóspedes e funcionários.
          </p>
        </div>

        <form
          className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            try {
              const result = await registerDeviceFn({
                data: {
                  name: String(form.get("deviceName") ?? ""),
                  ip: String(form.get("ipAddress") ?? ""),
                  port: Number(form.get("port") ?? port),
                  username: String(form.get("deviceUser") ?? "admin"),
                  password: String(form.get("devicePassword") ?? ""),
                  model: selected.id,
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
              setError("Não foi possível cadastrar o equipamento.");
            } finally {
              setPending(false);
            }
          }}
        >
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
              <h3 className="text-title-lg text-primary">Rede</h3>
              <Icon name="router" className="text-on-surface-variant" />
            </div>
            <div className="space-y-lg p-lg">
              <div className="space-y-base">
                <label className="block text-label-md text-on-surface-variant" htmlFor="deviceName">
                  Nome do equipamento <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Icon
                    name="badge"
                    className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    id="deviceName"
                    name="deviceName"
                    required
                    type="text"
                    placeholder="e.g., Lobby Entrance Terminal A"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="space-y-base">
                <label className="block text-label-md text-on-surface-variant" htmlFor="location">
                  Local
                </label>
                <div className="relative">
                  <Icon
                    name="location_on"
                    className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="Main Entrance"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="ipAddress">
                    Endereço IP <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Icon
                      name="lan"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      id="ipAddress"
                      name="ipAddress"
                      required
                      type="text"
                      placeholder="192.168.1.100"
                      className={`${fieldClass} font-mono`}
                    />
                  </div>
                </div>
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="port">
                    Porta
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

              <div className="space-y-lg border-t border-outline-variant pt-lg">
                <h4 className="flex items-center gap-xs text-title-lg text-primary">
                  <Icon name="admin_panel_settings" className="text-xl text-secondary" />
                  Credenciais do equipamento
                </h4>
                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  <div className="space-y-base">
                    <label
                      className="block text-label-md text-on-surface-variant"
                      htmlFor="deviceUser"
                    >
                      Usuário administrador
                    </label>
                    <div className="relative">
                      <Icon
                        name="person"
                        className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                      />
                      <input
                        id="deviceUser"
                        name="deviceUser"
                        type="text"
                        defaultValue="admin"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-base">
                    <label
                      className="block text-label-md text-on-surface-variant"
                      htmlFor="devicePassword"
                    >
                      Senha
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
                        required
                        placeholder="••••••••"
                        className={`${fieldClass} pr-[40px]`}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                      >
                        <Icon
                          name={showPassword ? "visibility_off" : "visibility"}
                          className="text-sm"
                        />
                      </button>
                    </div>
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
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1">
              <div className="flex items-center justify-between rounded-t-xl border-b border-outline-variant bg-surface-container-low px-lg py-md">
                <h3 className="text-title-lg text-primary">Modelo</h3>
                <Icon name="memory" className="text-on-surface-variant" />
              </div>
              <div className="relative space-y-md p-lg">
                <div className="space-y-base">
                  <span className="block text-label-md text-on-surface-variant">Selecionar modelo</span>
                  <div className="relative" ref={containerRef}>
                    <button
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border-2 border-secondary-container bg-surface-container-lowest py-sm pl-md pr-sm text-body-md font-bold text-primary outline-none transition-all"
                    >
                      <span className="flex items-center gap-xs">
                        <Icon name={selected.icon} className="text-secondary" />
                        {selected.name}
                      </span>
                      <Icon name="expand_more" className="text-on-surface-variant" />
                    </button>

                    {open && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-elevation-1">
                        <ul className="py-1">
                          {DEVICE_MODELS.map((model) => {
                            const active = model.name === selected.name;
                            return (
                              <li
                                key={model.name}
                                className={
                                  active
                                    ? "border-l-4 border-secondary-container bg-secondary-fixed/20"
                                    : ""
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelected(model);
                                    setPort(String(model.defaultPort));
                                    setOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-md py-sm text-left text-body-md transition-colors ${
                                    active
                                      ? "font-bold text-primary hover:bg-secondary-fixed/30"
                                      : "text-on-surface hover:bg-surface-container-low"
                                  }`}
                                >
                                  <span className="flex items-center gap-xs">
                                    <Icon
                                      name={model.icon}
                                      className={
                                        active
                                          ? "text-sm text-secondary"
                                          : "text-sm text-on-surface-variant"
                                      }
                                    />
                                    {model.name}
                                  </span>
                                  {active && <Icon name="check" className="text-sm text-secondary" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-md rounded-lg border border-outline-variant bg-surface p-md">
                  <div className="flex items-start gap-md">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container-high">
                      <Icon name="device_hub" className="text-3xl text-on-surface-variant" />
                    </div>
                    <div>
                      <h5 className="mb-1 text-label-md text-primary">
                        {selected.name.replace("Control ID ", "")} — especificações
                      </h5>
                      <ul className="space-y-1 text-xs text-on-surface-variant">
                        {selected.specs.map((spec) => (
                          <li key={spec}>• {spec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-elevation-1">
              <button
                type="submit"
                disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-semibold text-on-primary shadow-elevation-1 transition-colors hover:bg-tertiary-container disabled:opacity-70"
              >
                <Icon name="check_circle" className="text-sm" />
                {pending ? "Conectando…" : "Cadastrar equipamento"}
              </button>
              <Link
                to="/devices"
                className="flex h-12 w-full items-center justify-center gap-xs rounded-lg border border-outline bg-transparent px-md py-sm text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
              >
                <Icon name="cancel" className="text-sm" />
                Cancelar
              </Link>
            </div>
          </aside>
        </form>
      </main>
    </AppShell>
  );
}
