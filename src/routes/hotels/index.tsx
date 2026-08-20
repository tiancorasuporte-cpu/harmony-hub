import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { enterHotelFn } from "@/lib/auth";
import {
  getGroqSettingsFn,
  saveGroqSettingsFn,
  testGroqFn,
} from "@/lib/groq-settings";
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
  loader: async () => {
    const [hotels, groq] = await Promise.all([listHotelsFn(), getGroqSettingsFn()]);
    return { hotels, groq };
  },
  head: () => ({
    meta: [{ title: "Hotéis — Âncora Access" }],
  }),
  component: HotelsPage,
});

function HotelsPage() {
  const { hotels, groq } = Route.useLoaderData();
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

          <GroqSettingsPanel initial={groq} fieldClass={fieldClass} />

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

function GroqSettingsPanel({
  initial,
  fieldClass,
}: {
  initial: {
    model: string;
    hasApiKey: boolean;
    configured: boolean;
    maskedKey: string | null;
  };
  fieldClass: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <h3 className="mb-sm flex items-center gap-xs text-title-lg text-primary">
        <Icon name="smart_toy" className="text-secondary" />
        Assistente IA (Groq)
      </h3>
      <p className="mb-md text-body-md text-on-surface-variant">
        Configure aqui a chave do Groq. Ela é salva no <code className="text-label-md">.env</code> do
        servidor — em um servidor novo você sobe o código e cola a chave neste painel.
      </p>
      <p className="mb-md text-label-md text-on-surface-variant">
        Status:{" "}
        {initial.configured ? (
          <span className="font-semibold text-primary">
            ativa {initial.maskedKey ? `(${initial.maskedKey})` : ""}
          </span>
        ) : (
          <span className="font-semibold text-on-surface-variant">
            não configurada (ajuda rápida no chat)
          </span>
        )}
      </p>

      <form
        className="grid grid-cols-1 gap-md md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          setPending(true);
          try {
            const result = await saveGroqSettingsFn({
              data: {
                apiKey: String(form.get("apiKey") ?? ""),
                model: String(form.get("model") ?? ""),
              },
            });
            if (!result.ok) {
              setError("Não foi possível salvar.");
              return;
            }
            setMessage(
              result.cleared
                ? "Chave removida. O chat volta para a ajuda rápida."
                : "Configuração Groq salva no servidor.",
            );
            event.currentTarget.reset();
            await router.invalidate();
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="text-label-md text-on-surface-variant md:col-span-2">
          Chave da API Groq
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={initial.hasApiKey ? "Deixe em branco para manter a chave atual" : "gsk_…"}
            className={fieldClass}
          />
        </label>
        <label className="text-label-md text-on-surface-variant md:col-span-2">
          Modelo
          <input
            name="model"
            required
            defaultValue={initial.model || "openai/gpt-oss-20b"}
            placeholder="openai/gpt-oss-20b"
            className={fieldClass}
          />
        </label>
        <div className="flex flex-wrap gap-xs md:col-span-2">
          <button
            type="submit"
            disabled={pending || testing}
            className="rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container disabled:opacity-70"
          >
            {pending ? "Salvando…" : "Salvar Groq"}
          </button>
          <button
            type="button"
            disabled={pending || testing || !initial.configured}
            className="rounded-lg border border-outline-variant px-md py-sm text-label-md text-primary disabled:opacity-60"
            onClick={async () => {
              setError(null);
              setMessage(null);
              setTesting(true);
              try {
                const result = await testGroqFn();
                if (!result.ok) setError(result.error);
                else setMessage(`Teste ok: ${result.answer}`);
              } finally {
                setTesting(false);
              }
            }}
          >
            {testing ? "Testando…" : "Testar conexão"}
          </button>
          <button
            type="button"
            disabled={pending || testing || !initial.hasApiKey}
            className="rounded-lg border border-error/30 bg-error-container px-md py-sm text-label-md text-on-error-container disabled:opacity-60"
            onClick={async () => {
              if (!window.confirm("Remover a chave Groq deste servidor?")) return;
              setError(null);
              setMessage(null);
              setPending(true);
              try {
                await saveGroqSettingsFn({
                  data: {
                    apiKey: "",
                    model: initial.model || "openai/gpt-oss-20b",
                    clearKey: true,
                  },
                });
                setMessage("Chave removida.");
                await router.invalidate();
              } finally {
                setPending(false);
              }
            }}
          >
            Remover chave
          </button>
        </div>
      </form>
      {error ? <p className="mt-md text-label-md text-error">{error}</p> : null}
      {message ? <p className="mt-md text-label-md text-primary">{message}</p> : null}
    </section>
  );
}
