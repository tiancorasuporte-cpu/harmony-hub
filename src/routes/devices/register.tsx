import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/devices/register")({
  head: () => ({
    meta: [
      { title: "Register Equipment — Âncora Access" },
      {
        name: "description",
        content:
          "Provision a new physical access control device into the Âncora network with network settings and credentials.",
      },
      { property: "og:title", content: "Register Equipment — Âncora Access" },
      {
        property: "og:description",
        content: "Provision a new access control device into the Âncora network.",
      },
    ],
  }),
  component: RegisterDevice,
});

const MODELS = [
  {
    name: "Control ID Bio",
    icon: "fingerprint",
    specs: ["Fingerprint + RFID", "Up to 3,000 templates", "TCP/IP, Wiegand"],
  },
  {
    name: "Control ID Face MAX",
    icon: "face",
    specs: ["Facial Recognition + RFID", "Up to 10,000 faces capacity", "TCP/IP, Wiegand, Relays"],
  },
  {
    name: "Control ID QR",
    icon: "qr_code_scanner",
    specs: ["QR code + RFID", "Unlimited rotating codes", "TCP/IP, Relays"],
  },
];

function RegisterDevice() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(MODELS[1]!);
  const [showPassword, setShowPassword] = useState(false);
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
    <AppShell mobileTitle="Registration">
      <main className="flex-1 overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
        <div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-end">
          <div>
            <div className="mb-xs flex items-center gap-xs text-label-md text-on-surface-variant">
              <Icon name="key_visualizer" className="text-sm" />
              <Link to="/devices" className="hover:text-primary">
                Devices
              </Link>
              <Icon name="chevron_right" className="text-sm" />
              <span className="font-bold text-primary">Registration</span>
            </div>
            <h2 className="text-headline-lg tracking-tight text-primary md:text-display-lg">
              Register Equipment
            </h2>
            <p className="mt-base max-w-2xl text-body-lg text-on-surface-variant">
              Provision a new physical access control device into the Âncora network.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
              <h3 className="text-title-lg text-primary">Network Configuration</h3>
              <Icon name="router" className="text-on-surface-variant" />
            </div>
            <form className="space-y-lg p-lg" onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-base">
                <label className="block text-label-md text-on-surface-variant" htmlFor="deviceName">
                  Device Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Icon
                    name="badge"
                    className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    id="deviceName"
                    type="text"
                    placeholder="e.g., Lobby Entrance Terminal A"
                    className={fieldClass}
                  />
                </div>
                <p className="text-xs text-on-surface-variant">
                  A descriptive identifier for administrative dashboards.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="ipAddress">
                    IP Address (Static) <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Icon
                      name="lan"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      id="ipAddress"
                      type="text"
                      placeholder="192.168.1.100"
                      className={`${fieldClass} font-mono`}
                    />
                  </div>
                </div>
                <div className="space-y-base">
                  <label className="block text-label-md text-on-surface-variant" htmlFor="port">
                    Communication Port
                  </label>
                  <div className="relative">
                    <Icon
                      name="settings_input_component"
                      className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      id="port"
                      type="text"
                      defaultValue="8080"
                      className={`${fieldClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-lg border-t border-outline-variant pt-lg">
                <h4 className="flex items-center gap-xs text-title-lg text-primary">
                  <Icon name="admin_panel_settings" className="text-xl text-secondary" />
                  Device Credentials
                </h4>
                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  <div className="space-y-base">
                    <label
                      className="block text-label-md text-on-surface-variant"
                      htmlFor="deviceUser"
                    >
                      Administrator Username
                    </label>
                    <div className="relative">
                      <Icon
                        name="person"
                        className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                      />
                      <input
                        id="deviceUser"
                        type="text"
                        placeholder="admin"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-base">
                    <label
                      className="block text-label-md text-on-surface-variant"
                      htmlFor="devicePassword"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Icon
                        name="password"
                        className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
                      />
                      <input
                        id="devicePassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`${fieldClass} pr-[40px]`}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
            </form>
          </section>

          <aside className="space-y-gutter lg:col-span-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1">
              <div className="flex items-center justify-between rounded-t-xl border-b border-outline-variant bg-surface-container-low px-lg py-md">
                <h3 className="text-title-lg text-primary">Hardware Profile</h3>
                <Icon name="memory" className="text-on-surface-variant" />
              </div>
              <div className="relative space-y-md p-lg">
                <div className="space-y-base">
                  <span className="block text-label-md text-on-surface-variant">Select Model</span>
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
                          {MODELS.map((model) => {
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
                        {selected.name.replace("Control ID ", "")} Specifications
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
                type="button"
                className="flex h-12 w-full items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-semibold text-on-primary shadow-elevation-1 transition-colors hover:bg-tertiary-container"
              >
                <Icon name="check_circle" className="text-sm" />
                Register Equipment
              </button>
              <Link
                to="/devices"
                className="flex h-12 w-full items-center justify-center gap-xs rounded-lg border border-outline bg-transparent px-md py-sm text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
              >
                <Icon name="cancel" className="text-sm" />
                Cancel
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
