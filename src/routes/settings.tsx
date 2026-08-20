import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import {
  clearHotelLogoFn,
  getHotelBrandingFn,
  uploadHotelLogoFn,
} from "@/lib/hotels";
import { getOverviewFn } from "@/lib/monitoring";
import { isAdmin, requireAuth } from "@/lib/require-auth";
import { formatPhone } from "@/lib/stay";
import { getWahaSettingsFn, saveWahaSettingsFn, testWahaFn } from "@/lib/waha";
import { Route as RootRoute } from "@/routes/__root";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  loader: async () => {
    const [overview, waha, branding] = await Promise.all([
      getOverviewFn(),
      getWahaSettingsFn(),
      getHotelBrandingFn(),
    ]);
    return { overview, waha, branding };
  },
  head: () => ({
    meta: [{ title: "Configurações — Âncora Access" }],
  }),
  component: Settings,
});

function Settings() {
  const { overview, waha, branding } = Route.useLoaderData();
  const { user } = RootRoute.useRouteContext();
  const admin = isAdmin(user);

  const cards = [
    ...(admin ? [{ label: "Equipamentos", value: overview.devices, to: "/devices" as const }] : []),
    { label: "Hóspedes", value: overview.people, to: "/people" as const },
    { label: "Ativos agora", value: overview.active, to: "/monitoring" as const },
    ...(branding.moduleCameras
      ? [{ label: "Câmeras", value: "→" as const, to: "/cameras" as const }]
      : []),
    { label: "Eventos de acesso", value: overview.events, to: "/monitoring" as const },
    ...(admin ? [{ label: "Usuários", value: "→" as const, to: "/users" as const }] : []),
  ];

  return (
    <AppShell mobileTitle="Configurações">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-[56rem] space-y-lg">
          <div>
            <h2 className="text-headline-lg tracking-tight text-primary">Configurações</h2>
            <p className="mt-base text-body-lg text-on-surface-variant">
              Status da integração com PostgreSQL e Face Max
              {branding.moduleCameras || branding.moduleWaha
                ? `, ${[branding.moduleCameras ? "câmeras" : null, branding.moduleWaha ? "WhatsApp (Waha)" : null].filter(Boolean).join(" e ")}`
                : ""}
              .
            </p>
          </div>

          <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
            {cards.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md hover:shadow-elevation-1"
              >
                <div className="text-label-md uppercase text-on-surface-variant">{item.label}</div>
                <div className="mt-base text-headline-md text-primary">{item.value}</div>
              </Link>
            ))}
          </div>

          {admin ? <PartnerLogoSettings initial={branding} /> : null}

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-sm flex items-center gap-xs text-title-lg text-primary">
              <Icon name="face" className="text-secondary" />
              Control iD Face Max
            </h3>
            <p className="text-body-md text-on-surface-variant">
              A integração usa a API REST Access Line em modo standalone: login, cadastro de usuários,
              envio de faces e leitura de logs. Documentação:{" "}
              <a
                className="text-primary underline"
                href="https://www.controlid.com.br/docs/access-api-pt/"
                target="_blank"
                rel="noreferrer"
              >
                controlid.com.br/docs/access-api-pt
              </a>
            </p>
          </section>

          {admin && branding.moduleWaha && waha ? <WahaSettings initial={waha} /> : null}
        </div>
      </main>
    </AppShell>
  );
}

function PartnerLogoSettings({
  initial,
}: {
  initial: {
    hotelId: number | null;
    name: string | null;
    logo: { mime: string; base64: string } | null;
  };
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(
    initial.logo ? `data:${initial.logo.mime};base64,${initial.logo.base64}` : null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(initial.logo ? `data:${initial.logo.mime};base64,${initial.logo.base64}` : null);
  }, [initial.logo]);

  if (!initial.hotelId) return null;

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <h3 className="mb-sm flex items-center gap-xs text-title-lg text-primary">
        <Icon name="image" className="text-secondary" />
        Logo do parceiro
      </h3>
      <p className="mb-md text-body-md text-on-surface-variant">
        Aparece no topo do menu lateral, junto com o nome do hotel ({initial.name ?? "unidade"}). A
        marca Âncora Access fica no rodapé do menu.
      </p>
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high">
          {preview ? (
            <img src={preview} alt="Logo do parceiro" className="h-full w-full object-contain p-1" />
          ) : (
            <Icon name="apartment" className="text-3xl text-on-surface-variant" />
          )}
        </div>
        <div className="flex flex-wrap gap-sm">
          <label className="flex h-12 cursor-pointer items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary">
            {pending ? "Enviando…" : "Enviar logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={pending}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setPending(true);
                setError(null);
                setMessage(null);
                try {
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result ?? ""));
                    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
                    reader.readAsDataURL(file);
                  });
                  const result = await uploadHotelLogoFn({
                    data: { logoBase64: dataUrl, logoMime: file.type || "image/png" },
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setPreview(dataUrl);
                  setMessage("Logo atualizada.");
                  window.dispatchEvent(new Event("hotel-branding-changed"));
                  await router.invalidate();
                } catch {
                  setError("Não foi possível enviar a logo.");
                } finally {
                  setPending(false);
                }
              }}
            />
          </label>
          {preview ? (
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError(null);
                setMessage(null);
                try {
                  await clearHotelLogoFn();
                  setPreview(null);
                  setMessage("Logo removida.");
                  window.dispatchEvent(new Event("hotel-branding-changed"));
                  await router.invalidate();
                } catch {
                  setError("Não foi possível remover a logo.");
                } finally {
                  setPending(false);
                }
              }}
              className="flex h-12 items-center justify-center rounded-lg border border-outline px-md text-sm font-semibold text-primary disabled:opacity-70"
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="mt-md text-label-md text-primary">{message}</p> : null}
      {error ? <p className="mt-md text-label-md text-error">{error}</p> : null}
    </section>
  );
}

function WahaSettings({
  initial,
}: {
  initial: { url: string; session: string; hasApiKey: boolean; configured: boolean };
}) {
  const fieldClass =
    "input-glow mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary";
  const [url, setUrl] = useState(initial.url);
  const [apiKey, setApiKey] = useState("");
  const [session, setSession] = useState(initial.session);
  const [testPhone, setTestPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(
    initial.configured ? "Waha configurado. A mensagem sai quando a face entra no Face Max." : null,
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <h3 className="mb-sm flex items-center gap-xs text-title-lg text-primary">
        <Icon name="chat" className="text-secondary" />
        WhatsApp (Waha)
      </h3>
      <p className="mb-md text-body-md text-on-surface-variant">
        Depois que o cadastro facial do hóspede for gravado no Face Max, o Âncora Access envia um
        WhatsApp com o hotel, o equipamento e os horários de check-in e check-out.
      </p>
      <form
        className="space-y-md"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          setMessage(null);
          try {
            const result = await saveWahaSettingsFn({
              data: { url, apiKey, session },
            });
            if (result.ok) setMessage("Configuração do Waha salva.");
          } catch {
            setError("Não foi possível salvar a configuração do Waha.");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block text-label-md text-on-surface-variant">
          URL do Waha
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://192.168.10.10:3000"
            className={fieldClass}
          />
        </label>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <label className="block text-label-md text-on-surface-variant">
            Sessão
            <input
              value={session}
              onChange={(event) => setSession(event.target.value)}
              placeholder="default"
              className={fieldClass}
            />
          </label>
          <label className="block text-label-md text-on-surface-variant">
            API key {initial.hasApiKey ? "(já salva; deixe em branco para manter)" : ""}
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={initial.hasApiKey ? "••••••••" : "X-Api-Key"}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="flex flex-col gap-sm sm:flex-row sm:items-end">
          <label className="block flex-1 text-label-md text-on-surface-variant">
            WhatsApp para teste
            <input
              value={testPhone}
              onChange={(event) => setTestPhone(formatPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            disabled={testing || pending}
            onClick={async () => {
              setTesting(true);
              setError(null);
              setMessage(null);
              try {
                const result = await testWahaFn({ data: { phone: testPhone } });
                if (result.ok) setMessage("Mensagem de teste enviada.");
                else setError(result.error);
              } catch {
                setError("Não foi possível testar o Waha.");
              } finally {
                setTesting(false);
              }
            }}
            className="flex h-12 items-center justify-center rounded-lg border border-outline bg-surface-container-lowest px-md text-sm font-semibold text-primary disabled:opacity-70"
          >
            {testing ? "Enviando…" : "Testar envio"}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary disabled:opacity-70"
          >
            {pending ? "Salvando…" : "Salvar Waha"}
          </button>
        </div>
        {message ? <p className="text-label-md text-primary">{message}</p> : null}
        {error ? <p className="text-label-md text-error">{error}</p> : null}
      </form>
    </section>
  );
}
