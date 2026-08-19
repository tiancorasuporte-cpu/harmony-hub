import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppShell, useShellSearch } from "@/components/AppShell";
import { FilterChips, MobileSearch } from "@/components/FilterBar";
import { Icon } from "@/components/Icon";
import { PersonPhoto } from "@/components/PersonPhoto";
import { formatWhen } from "@/lib/format";
import { listPresenceFn } from "@/lib/monitoring";
import { requireAuth } from "@/lib/require-auth";
import { matchesQuery } from "@/lib/text-search";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const YEARS = Array.from({ length: 8 }, (_, index) => new Date().getFullYear() - index);

type MonitoringSearch = {
  year?: number;
  month?: number;
  day?: number;
  page?: number;
};

function optionalInt(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

const selectClass =
  "input-glow mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary";

export const Route = createFileRoute("/monitoring")({
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>): MonitoringSearch => ({
    year: optionalInt(search.year, 2000, 2100),
    month: optionalInt(search.month, 1, 12),
    day: optionalInt(search.day, 1, 31),
    page: optionalInt(search.page, 1, 100000),
  }),
  loaderDeps: ({ search }) => ({
    year: search.year,
    month: search.month,
    day: search.day,
    page: search.page,
  }),
  loader: ({ deps }) => listPresenceFn({ data: deps }),
  head: () => ({
    meta: [
      { title: "Monitoramento — Âncora Access" },
      {
        name: "description",
        content: "Presença e eventos do Face Max: face, botoeira e acionamento remoto.",
      },
    ],
  }),
  component: Monitoring,
});

function eventIcon(kind: string) {
  if (kind === "face") return "face";
  if (kind === "button") return "touch_app";
  if (kind === "remote") return "settings_remote";
  if (kind === "denied") return "block";
  return "event";
}

function Monitoring() {
  const { people, events, eventTotal, eventPage, eventPageCount } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const { query } = useShellSearch();
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "guest" | "staff">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "face" | "button" | "remote">("all");
  const active = people.filter((person) => person.status === "Active").length;
  const hasDateFilter = Boolean(search.year || search.month || search.day);

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      void router.invalidate();
    };
    const timer = setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const visiblePeople = useMemo(() => {
    return people.filter((person) => {
      if (statusFilter !== "all" && person.status !== statusFilter) return false;
      if (kindFilter !== "all" && person.kind !== kindFilter) return false;
      return matchesQuery(query, [person.name, person.role, person.lastDevice, person.status, person.kind]);
    });
  }, [people, query, statusFilter, kindFilter]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventFilter !== "all" && event.kind !== eventFilter) return false;
      return matchesQuery(query, [event.label, event.deviceName, event.personName, event.kind]);
    });
  }, [events, eventFilter, query]);

  function updateSearch(patch: MonitoringSearch, resetPage = false) {
    void navigate({
      search: (prev) => {
        const next: MonitoringSearch = { ...prev, ...patch };
        if (resetPage) delete next.page;
        if (!next.year) delete next.year;
        if (!next.month) delete next.month;
        if (!next.day) delete next.day;
        if (!next.page || next.page <= 1) delete next.page;
        return next;
      },
      replace: true,
    });
  }

  return (
    <AppShell mobileTitle="Monitoramento" searchPlaceholder="Buscar pessoa, quarto ou evento...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-[80rem] space-y-lg">
          <div>
            <h2 className="text-headline-lg tracking-tight text-primary">Monitoramento</h2>
            <p className="mt-base text-body-lg text-on-surface-variant">
              Eventos do Face Max (face, botoeira e acionamento remoto). {active} ativo
              {active === 1 ? "" : "s"} agora. Atualização contínua.
            </p>
          </div>

          <section className="space-y-sm">
            <h3 className="text-title-lg text-primary">Eventos de acesso</h3>
            <p className="text-body-md text-on-surface-variant">
              {eventTotal === 0
                ? "Nenhum acesso registrado ainda."
                : `${eventTotal} acesso${eventTotal === 1 ? "" : "s"} — mostrando 10 por página.`}
            </p>
            <MobileSearch placeholder="Buscar pessoa, equipamento ou tipo de evento..." />
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
              <label className="block text-label-md text-on-surface-variant">
                Dia
                <select
                  className={selectClass}
                  value={search.day ?? ""}
                  onChange={(event) =>
                    updateSearch({ day: event.target.value ? Number(event.target.value) : undefined }, true)
                  }
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      {String(day).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-label-md text-on-surface-variant">
                Mês
                <select
                  className={selectClass}
                  value={search.month ?? ""}
                  onChange={(event) =>
                    updateSearch({ month: event.target.value ? Number(event.target.value) : undefined }, true)
                  }
                >
                  <option value="">Todos</option>
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-label-md text-on-surface-variant">
                Ano
                <select
                  className={selectClass}
                  value={search.year ?? ""}
                  onChange={(event) =>
                    updateSearch({ year: event.target.value ? Number(event.target.value) : undefined }, true)
                  }
                >
                  <option value="">Todos</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {hasDateFilter ? (
              <button
                type="button"
                className="text-label-md text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  void navigate({
                    search: {},
                    replace: true,
                  })
                }
              >
                Limpar data
              </button>
            ) : null}
            <FilterChips
              value={eventFilter}
              onChange={setEventFilter}
              options={[
                { id: "all", label: "Todos" },
                { id: "face", label: "Face" },
                { id: "button", label: "Botoeira" },
                { id: "remote", label: "Acionamento remoto" },
              ]}
            />
            {visibleEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-on-surface-variant">
                {hasDateFilter
                  ? "Nenhum acesso nesse dia, mês ou ano."
                  : "Nenhum evento ainda. Passe a face no Face Max, use a botoeira ou abra a porta pelo equipamento."}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                  {visibleEvents.map((event) => (
                    <li key={event.id} className="flex items-center gap-md px-md py-sm">
                      {event.personId ? (
                        <PersonPhoto id={event.personId} name={event.personName ?? ""} hasPhoto={event.hasPhoto} />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high">
                          <Icon name={eventIcon(event.kind)} className="text-on-surface-variant" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-title-lg text-on-surface">
                          {event.personName ?? "Não identificado"}
                        </p>
                        <p className="text-label-md text-on-surface-variant">
                          {event.label}
                          {event.personKind === "staff"
                            ? " • funcionário"
                            : event.personKind === "guest"
                              ? " • hóspede"
                              : ""}
                          {" • "}
                          {event.deviceName}
                        </p>
                      </div>
                      <time className="shrink-0 text-label-md text-on-surface-variant">
                        {formatWhen(event.occurredAt)}
                      </time>
                    </li>
                  ))}
                </ul>
                {eventPageCount > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <button
                      type="button"
                      disabled={eventPage <= 1}
                      className="rounded-lg border border-outline-variant px-md py-sm text-label-md text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => updateSearch({ page: eventPage - 1 })}
                    >
                      Anterior
                    </button>
                    <p className="text-label-md text-on-surface-variant">
                      Página {eventPage} de {eventPageCount}
                    </p>
                    <button
                      type="button"
                      disabled={eventPage >= eventPageCount}
                      className="rounded-lg border border-outline-variant px-md py-sm text-label-md text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => updateSearch({ page: eventPage + 1 })}
                    >
                      Próxima
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <div className="space-y-sm">
            <h3 className="text-title-lg text-primary">Presença</h3>
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { id: "all", label: "Todos" },
                { id: "Active", label: "Ativos" },
                { id: "Inactive", label: "Inativos" },
              ]}
            />
            <FilterChips
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { id: "all", label: "Todos os tipos" },
                { id: "guest", label: "Hóspedes" },
                { id: "staff", label: "Funcionários" },
              ]}
            />
          </div>

          {people.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center">
              <Icon name="group" className="mb-sm text-4xl text-on-surface-variant" />
              <h3 className="text-title-lg text-primary">Ninguém cadastrado</h3>
              <p className="mt-base text-body-md text-on-surface-variant">
                Cadastre hóspedes ou funcionários e sincronize com o Face Max. Os acessos aparecem aqui.
              </p>
            </div>
          ) : visiblePeople.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center text-on-surface-variant">
              Nenhuma presença com esses filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePeople.map((person) => (
                <article
                  key={person.id}
                  className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-shadow hover:shadow-elevation-1"
                >
                  <div className="flex items-start justify-between">
                    <PersonPhoto id={person.id} name={person.name} hasPhoto={person.hasPhoto} />
                    <span
                      className={
                        person.status === "Active"
                          ? "rounded-full bg-success-container px-xs py-base text-label-md text-on-success-container"
                          : "rounded-full bg-surface-variant px-xs py-base text-label-md text-on-surface-variant"
                      }
                    >
                      {person.status === "Active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-title-lg text-on-surface">{person.name}</h3>
                    <p className="text-body-md text-on-surface-variant">{person.role}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-surface-variant pt-sm text-on-surface-variant">
                    <div className="flex items-center gap-xs text-label-md">
                      <Icon name="login" className="text-[16px]" />
                      {formatWhen(person.since)}
                    </div>
                    {person.lastDevice ? (
                      <span className="text-label-md">{person.lastDevice}</span>
                    ) : null}
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
