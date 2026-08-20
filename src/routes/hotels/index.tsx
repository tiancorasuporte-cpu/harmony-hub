import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { enterHotelFn } from "@/lib/auth";
import {
  createHotelFn,
  deleteHotelFn,
  listHotelsFn,
  renameHotelFn,
  setHotelActiveFn,
  setHotelModulesFn,
} from "@/lib/hotels";
import { requireSuperadmin } from "@/lib/require-auth";

export const Route = createFileRoute("/hotels/")({
  beforeLoad: requireSuperadmin,
  loader: () => listHotelsFn(),
  head: () => ({
    meta: [{ title: "Hotéis — Âncora Access" }],
  }),
  component: HotelsPage,
});

function HotelsPage() {
  const hotels = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fieldClass =
    "mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md outline-none focus:border-primary";

  return (
    <AppShell mobileTitle="Hotéis" searchPlaceholder="Buscar hotel...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-5xl space-y-lg">
          <div>
            <h2 className="text-headline-lg tracking-tight text-primary">Hotéis</h2>
            <p className="mt-base text-body-lg text-on-surface-variant">
              Gerencie unidades, libere módulos (Câmeras e Waha) e entre para operar como a unidade.
            </p>
          </div>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-md text-title-lg text-primary">Novo hotel</h3>
            <form
              className="grid grid-cols-1 gap-md md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                setMessage(null);
                const form = event.currentTarget;
                const data = new FormData(form);
                setPending(true);
                try {
                  const result = await createHotelFn({
                    data: {
                      name: String(data.get("name") ?? ""),
                      adminName: String(data.get("adminName") ?? ""),
                      adminUsername: String(data.get("adminUsername") ?? ""),
                      adminPassword: String(data.get("adminPassword") ?? ""),
                    },
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage(
                    `${result.hotel.name} criado. Libere os módulos desejados e use o admin da unidade no login.`,
                  );
                  form.reset();
                  await router.invalidate();
                } finally {
                  setPending(false);
                }
              }}
            >
              <label className="text-label-md text-on-surface-variant">
                Nome do hotel
                <input name="name" required className={fieldClass} placeholder="Hotel Plaza" />
              </label>
              <label className="text-label-md text-on-surface-variant">
                Nome do administrador
                <input name="adminName" required defaultValue="Administrador" className={fieldClass} />
              </label>
              <label className="text-label-md text-on-surface-variant">
                Usuário do administrador
                <input name="adminUsername" required defaultValue="admin" className={fieldClass} />
              </label>
              <label className="text-label-md text-on-surface-variant">
                Senha do administrador
                <input name="adminPassword" type="password" required minLength={4} className={fieldClass} />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container disabled:opacity-70"
                >
                  {pending ? "Criando..." : "Criar hotel"}
                </button>
              </div>
            </form>
            {error ? <p className="mt-md text-label-md text-error">{error}</p> : null}
            {message ? <p className="mt-md text-label-md text-primary">{message}</p> : null}
          </section>

          <ul className="space-y-md">
            {hotels.map((hotel) => (
              <li
                key={hotel.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-md">
                  <div className="min-w-0 flex-1">
                    <p className="text-title-lg text-on-surface">{hotel.name}</p>
                    <p className="text-label-md text-on-surface-variant">
                      Código: {hotel.slug} • login /?hotel={hotel.slug}
                    </p>
                    <p className="text-label-md text-on-surface-variant">
                      {hotel.users} usuários • {hotel.devices} equipamentos • {hotel.people} pessoas
                      {hotel.active ? "" : " • desativado"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    <button
                      type="button"
                      disabled={busyId === hotel.id}
                      className="rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container disabled:opacity-60"
                      onClick={async () => {
                        const result = await enterHotelFn({ data: { hotelId: hotel.id } });
                        if (result.ok) await navigate({ to: "/monitoring" });
                      }}
                    >
                      <span className="inline-flex items-center gap-xs">
                        <Icon name="login" className="text-sm" />
                        Entrar
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === hotel.id}
                      className="rounded-lg border border-outline-variant px-md py-sm text-label-md text-primary disabled:opacity-60"
                      onClick={async () => {
                        const next = window.prompt("Novo nome do hotel", hotel.name);
                        if (next == null) return;
                        const trimmed = next.trim();
                        if (trimmed.length < 2 || trimmed === hotel.name) return;
                        setBusyId(hotel.id);
                        setError(null);
                        try {
                          const result = await renameHotelFn({ data: { id: hotel.id, name: trimmed } });
                          if (!result.ok) setError(result.error);
                          else {
                            setMessage(`Hotel renomeado para ${result.hotel.name}.`);
                            await router.invalidate();
                          }
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Editar nome
                    </button>
                    <button
                      type="button"
                      disabled={busyId === hotel.id}
                      className="rounded-lg border border-outline-variant px-md py-sm text-label-md text-primary disabled:opacity-60"
                      onClick={async () => {
                        setBusyId(hotel.id);
                        try {
                          await setHotelActiveFn({ data: { id: hotel.id, active: !hotel.active } });
                          await router.invalidate();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {hotel.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === hotel.id}
                      className="rounded-lg border border-error/30 bg-error-container px-md py-sm text-label-md text-on-error-container disabled:opacity-60"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Excluir ${hotel.name}?\n\nIsso apaga usuários, pessoas, equipamentos e câmeras desta unidade. Não dá para desfazer.`,
                        );
                        if (!confirmed) return;
                        setBusyId(hotel.id);
                        setError(null);
                        try {
                          const result = await deleteHotelFn({ data: { id: hotel.id } });
                          if (!result.ok) setError(result.error);
                          else {
                            setMessage(`${hotel.name} excluído.`);
                            await router.invalidate();
                          }
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-md flex flex-wrap gap-md border-t border-outline-variant pt-md">
                  <p className="w-full text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                    Módulos liberados
                  </p>
                  <label className="flex items-center gap-sm text-body-md text-on-surface">
                    <input
                      type="checkbox"
                      checked={hotel.moduleCameras}
                      disabled={busyId === hotel.id}
                      onChange={async (event) => {
                        setBusyId(hotel.id);
                        try {
                          await setHotelModulesFn({
                            data: { id: hotel.id, cameras: event.target.checked },
                          });
                          await router.invalidate();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    Câmeras
                  </label>
                  <label className="flex items-center gap-sm text-body-md text-on-surface">
                    <input
                      type="checkbox"
                      checked={hotel.moduleWaha}
                      disabled={busyId === hotel.id}
                      onChange={async (event) => {
                        setBusyId(hotel.id);
                        try {
                          await setHotelModulesFn({
                            data: { id: hotel.id, waha: event.target.checked },
                          });
                          await router.invalidate();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    WhatsApp (Waha)
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </AppShell>
  );
}
