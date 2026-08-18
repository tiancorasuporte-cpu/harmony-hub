import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/people", label: "People", icon: "group" },
  { to: "/devices", label: "Devices", icon: "key_visualizer" },
  { to: "/monitoring", label: "Monitoring", icon: "monitoring" },
  { to: "/settings", label: "Settings", icon: "settings" },
] as const;

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDrjdRfJFKIP5xlNr0mokA1SpUCabwicHUZOsXb-RHDhtHrtWPOVCTVhvr5WkUytwuEizfPPtfbUq1o9qGBhZdV4cTQBxZ8XwN_M0xGrRn9sqYfIfZ6IBcfQhWtwUV2K6uEVvauVFD3p8fD93qIdpVuHsoriBUaPovE3FFpHgZyEREsB96rHRA69U_Rs3rJSbbRBpJU8eSbklS5OILLhmis4X21Y4N1jvRSAxIMo5_p5U0nzMYofiitUg";

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-sm rounded-lg px-md py-sm text-label-md transition-colors",
              active
                ? "border-r-4 border-secondary-container bg-surface-container-low font-bold text-primary"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            <Icon name={item.icon} filled={active} className="text-xl" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate, pathname }: { onNavigate?: (() => void) | undefined; pathname: string }) {
  return (
    <div className="flex h-full flex-col px-md py-xl">
      <div className="mb-xl flex items-center gap-sm px-xs">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-highest">
          <Icon name="admin_panel_settings" filled className="text-on-surface-variant" />
        </div>
        <div>
          <p className="text-headline-md font-bold leading-tight text-primary">Âncora Access</p>
          <p className="text-label-md uppercase tracking-wider text-on-surface-variant">
            Management Suite
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mb-lg flex w-full items-center justify-center gap-xs rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container shadow-elevation-1 transition-colors hover:bg-secondary-fixed active:scale-[0.98]"
      >
        <Icon name="add" className="text-sm" />
        Add New Access
      </button>

      <NavList pathname={pathname} onNavigate={onNavigate} />

      <div className="mt-auto space-y-1 border-t border-outline-variant pt-lg">
        <a
          href="#"
          className="flex items-center gap-sm rounded-lg px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="help_outline" className="text-xl" />
          <span>Help</span>
        </a>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-sm rounded-lg px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="logout" className="text-xl" />
          <span>Sign Out</span>
        </Link>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  mobileTitle,
  searchPlaceholder = "Search devices, IPs, or models...",
}: {
  children: ReactNode;
  mobileTitle: string;
  searchPlaceholder?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[280px] border-r border-outline-variant bg-surface md:block">
        <SidebarInner pathname={pathname} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-inverse-surface/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] border-r border-outline-variant bg-surface">
            <SidebarInner pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col md:ml-[280px]">
        <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile py-md md:px-margin-desktop">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-full p-2 text-on-surface transition-colors hover:bg-surface-container md:hidden"
          >
            <Icon name="menu" />
          </button>

          <div className="hidden max-w-md flex-1 items-center md:flex">
            <div className="relative w-full">
              <Icon
                name="search"
                className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                placeholder={searchPlaceholder}
                className="input-glow w-full rounded-full border border-transparent bg-surface-container-low py-sm pl-[40px] pr-sm text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-outline focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <div className="text-headline-md font-bold text-primary md:hidden">{mobileTitle}</div>

          <div className="flex items-center gap-sm">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <Icon name="notifications" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
            </button>
            <button
              type="button"
              aria-label="Help"
              className="hidden rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary sm:block"
            >
              <Icon name="help" />
            </button>
            <div className="mx-sm hidden h-6 w-px bg-outline-variant sm:block" />
            <button
              type="button"
              className="flex items-center gap-xs rounded-full p-1 transition-colors hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-secondary-container"
            >
              <img
                src={AVATAR}
                alt="Administrator profile"
                loading="lazy"
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
              />
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
