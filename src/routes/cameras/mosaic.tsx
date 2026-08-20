import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CameraMosaic } from "@/components/CameraMosaic";
import { Icon } from "@/components/Icon";
import { listCamerasFn } from "@/lib/cameras";
import { requireCamerasModule } from "@/lib/require-auth";
import { Route as RootRoute } from "@/routes/__root";

export const Route = createFileRoute("/cameras/mosaic")({
  beforeLoad: requireCamerasModule,
  loader: () => listCamerasFn(),
  head: () => ({
    meta: [{ title: "Mosaico de câmeras — Âncora Access" }],
  }),
  component: CameraMosaicPage,
});

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="tabular-nums text-label-md text-white/80">
      {now.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function CameraMosaicPage() {
  const cameras = Route.useLoaderData();
  const { user } = RootRoute.useRouteContext();
  const hotelName = user?.hotelName ?? "Hotel";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <header className="flex shrink-0 items-center justify-between gap-md border-b border-white/10 px-md py-xs">
        <div className="min-w-0">
          <h1 className="truncate text-body-md font-bold sm:text-title-lg">Mosaico de câmeras</h1>
          <p className="truncate text-label-md text-white/70">{hotelName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-sm">
          <HeaderClock />
          <Link
            to="/cameras"
            className="flex items-center gap-xs rounded-lg border border-white/20 px-sm py-xs text-label-md text-white hover:bg-white/10"
          >
            <Icon name="settings" className="text-sm" />
            Gerenciar
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-1">
        {cameras.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-white/60">
            Nenhuma câmera cadastrada. Peça ao administrador para adicionar links na suíte.
          </div>
        ) : (
          <CameraMosaic cameras={cameras} fillHeight />
        )}
      </main>
    </div>
  );
}
