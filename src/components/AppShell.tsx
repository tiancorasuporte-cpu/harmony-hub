import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { logoutFn, leaveHotelFn } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { isAdmin, isSuperadmin, roleLabel } from "@/lib/require-auth";
import { cn } from "@/lib/utils";
import { Route as RootRoute } from "@/routes/__root";
import type { AppUser } from "@/db/schema";

const ShellSearchContext = createContext<{
  query: string;
  setQuery: (value: string) => void;
}>({ query: "", setQuery: () => undefined });

export function useShellSearch() {
  return useContext(ShellSearchContext);
}

const NAV = [
  { to: "/people", label: "Hóspedes", icon: "hotel", adminOnly: false, module: null },
  { to: "/staff", label: "Funcionários", icon: "badge", adminOnly: false, module: null },
  { to: "/devices", label: "Equipamentos", icon: "key_visualizer", adminOnly: true, module: null },
  { to: "/monitoring", label: "Monitoramento", icon: "monitoring", adminOnly: false, module: null },
  { to: "/cameras", label: "Câmeras", icon: "videocam", adminOnly: false, module: "cameras" },
  { to: "/users", label: "Usuários", icon: "manage_accounts", adminOnly: true, module: null },
  { to: "/settings", label: "Configurações", icon: "settings", adminOnly: false, module: null },
] as const;

type HotelModules = { cameras: boolean; waha: boolean };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function NavList({
  pathname,
  user,
  modules,
  onNavigate,
}: {
  pathname: string;
  user: AppUser | null;
  modules: HotelModules;
  onNavigate?: (() => void) | undefined;
}) {
  const items = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin(user)) return false;
    if (item.module === "cameras" && !modules.cameras) return false;
    return true;
  });
  return (
    <nav className="flex-1 space-y-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
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

function SidebarInner({
  onNavigate,
  pathname,
  user,
}: {
  onNavigate?: (() => void) | undefined;
  pathname: string;
  user: AppUser | null;
}) {
  const navigate = useNavigate();
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  const [modules, setModules] = useState<HotelModules>({ cameras: false, waha: false });

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      if (!user?.hotelId) {
        setPartnerLogo(null);
        setModules({ cameras: false, waha: false });
        return;
      }
      const { getHotelBrandingFn } = await import("@/lib/hotels");
      const branding = await getHotelBrandingFn();
      if (cancelled) return;
      if (branding.logo) {
        setPartnerLogo(`data:${branding.logo.mime};base64,${branding.logo.base64}`);
      } else {
        setPartnerLogo(null);
      }
      setModules({
        cameras: branding.moduleCameras,
        waha: branding.moduleWaha,
      });
    }

    void loadBranding();
    const onChange = () => void loadBranding();
    window.addEventListener("hotel-branding-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hotel-branding-changed", onChange);
    };
  }, [user?.hotelId]);

  const hotelName = user?.hotelName ?? "Suíte de gestão";

  return (
    <div className="flex h-full flex-col px-md py-xl">
      <div className="mb-xl flex items-center gap-md px-xs">
        {partnerLogo ? (
          <img
            src={partnerLogo}
            alt={hotelName}
            className="h-16 max-h-16 max-w-[10rem] w-auto shrink-0 rounded-xl border border-outline-variant object-contain bg-surface-container-lowest p-1"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high">
            <Icon name="apartment" className="text-3xl text-on-surface-variant" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-title-lg leading-tight text-primary">{hotelName}</p>
          <p className="text-label-md uppercase tracking-wider text-on-surface-variant">
            {user?.hotelId ? "Unidade" : "Gestão"}
          </p>
        </div>
      </div>

      {pathname.startsWith("/hotels") ? null : (
      <div className="mb-lg space-y-sm">
        <Link
          to="/people/register"
          className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container shadow-elevation-1 transition-colors hover:bg-secondary-fixed active:scale-[0.98]"
        >
          <Icon name="add" className="text-sm" />
          Novo hóspede
        </Link>
        <Link
          to="/staff/register"
          className="flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-label-md font-bold text-primary transition-colors hover:bg-surface-container-high"
        >
          <Icon name="badge" className="text-sm" />
          Novo funcionário
        </Link>
      </div>
      )}

      {pathname.startsWith("/hotels") ? (
        <nav className="flex-1" />
      ) : (
        <NavList pathname={pathname} user={user} modules={modules} onNavigate={onNavigate} />
      )}

      <div className="mt-auto space-y-1 border-t border-outline-variant pt-lg">
        {isSuperadmin(user) && !pathname.startsWith("/hotels") ? (
          <Link
            to="/hotels"
            onClick={() => {
              onNavigate?.();
              void leaveHotelFn();
            }}
            className="flex w-full items-center gap-sm rounded-lg px-md py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name="apartment" className="text-xl" />
            <span>Hotéis</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            onNavigate?.();
            await logoutFn();
            await navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-sm rounded-lg px-md py-sm text-left text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="logout" className="text-xl" />
          <span>Sair</span>
        </button>

        <div className="mt-md flex items-center gap-sm border-t border-outline-variant px-xs pt-md">
          <BrandLogo className="h-8 w-auto shrink-0 opacity-90" />
          <div className="min-w-0">
            <p className="truncate text-label-md font-bold text-primary">{APP_NAME}</p>
            <p className="truncate text-[0.65rem] uppercase tracking-wider text-on-surface-variant">
              Âncora Segurança
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return <>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>;
}

function ProfileMenu({ user }: { user: AppUser | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label="Perfil"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-xs rounded-full p-1 transition-colors hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-secondary-container"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-secondary-container text-label-md font-bold text-on-secondary-container">
          {initials(user.name)}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-sm w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-elevation-1">
          <div className="border-b border-outline-variant px-md py-sm">
            <p className="truncate text-title-lg text-primary">{user.name}</p>
            <p className="text-label-md text-on-surface-variant">{roleLabel(user.role)}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="person" className="text-sm" />
            Meu perfil
          </Link>
          {isAdmin(user) ? (
            <Link
              to="/users"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="manage_accounts" className="text-sm" />
              Usuários
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await logoutFn();
              await navigate({ to: "/" });
            }}
            className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="logout" className="text-sm" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  children,
  mobileTitle,
  searchPlaceholder = "Buscar...",
}: {
  children: ReactNode;
  mobileTitle: string;
  searchPlaceholder?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = RootRoute.useRouteContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useMemo(() => ({ query, setQuery }), [query]);

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return (
    <ShellSearchContext.Provider value={search}>
    <div className="flex min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[280px] border-r border-outline-variant bg-surface md:block">
        <SidebarInner pathname={pathname} user={user} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-inverse-surface/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] border-r border-outline-variant bg-surface">
            <SidebarInner pathname={pathname} user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-[280px]">
        <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile py-md md:px-margin-desktop">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="rounded-full p-2 text-on-surface transition-colors hover:bg-surface-container md:hidden"
          >
            <Icon name="menu" />
          </button>

          <div className="hidden min-w-0 max-w-[28rem] flex-1 items-center md:flex">
            <div className="relative w-full">
              <Icon
                name="search"
                className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="input-glow w-full rounded-full border border-transparent bg-surface-container-low py-sm pl-[40px] pr-sm text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-outline focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <div className="text-headline-md font-bold text-primary md:hidden">{mobileTitle}</div>

          <div className="hidden px-md text-title-lg tabular-nums text-primary md:block">
            <HeaderClock />
          </div>

          <div className="flex items-center gap-sm">
            <ProfileMenu user={user} />
          </div>
        </header>

        {children}
      </div>
    </div>
    </ShellSearchContext.Provider>
  );
}
