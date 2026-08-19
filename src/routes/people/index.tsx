import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, useShellSearch } from "@/components/AppShell";
import { FilterChips, MobileSearch } from "@/components/FilterBar";
import { Icon } from "@/components/Icon";
import { PersonPhoto } from "@/components/PersonPhoto";
import { listPeopleFn, syncAllPeopleFn, deletePersonFn } from "@/lib/people";
import { formatWhen } from "@/lib/format";
import { isCheckedOut, isInStay } from "@/lib/stay";
import { matchesQuery } from "@/lib/text-search";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/people/")({
  beforeLoad: requireAuth,
  loader: () => listPeopleFn(),
  head: () => ({
    meta: [{ title: "Hóspedes — Âncora Access" }],
  }),
  component: People,
});

function stayLabel(checkIn: string | null, checkOut: string | null) {
  if (isCheckedOut(checkOut)) return "Check-out feito";
  if (isInStay(checkIn, checkOut)) return "Em estadia";
  return "Check-in pendente";
}

function People() {
  const people = Route.useLoaderData();
  const router = useRouter();
  const { query } = useShellSearch();
  const [stayFilter, setStayFilter] = useState<"all" | "inStay" | "pending" | "checkedOut">("all");
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const guests = useMemo(() => people.filter((person) => person.kind !== "staff"), [people]);

  const visible = useMemo(() => {
    return guests.filter((person) => {
      const stay = isCheckedOut(person.checkOut)
        ? "checkedOut"
        : isInStay(person.checkIn, person.checkOut)
          ? "inStay"
          : "pending";
      if (stayFilter !== "all" && stay !== stayFilter) return false;
      return matchesQuery(query, [person.name, person.cpf, person.room, person.roomType, person.phone]);
    });
  }, [guests, stayFilter, query]);

  return (
    <AppShell mobileTitle="Hóspedes" searchPlaceholder="Buscar nome, documento ou quarto...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-[80rem] space-y-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Hóspedes</h2>
              <p className="mt-base text-body-lg text-on-surface-variant">
                A face vai para o Face Max no check-in e é removida no check-out.
              </p>
            </div>
            <div className="flex flex-wrap gap-sm">
              <button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  const result = await syncAllPeopleFn();
                  setMessage(
                    result.errors.length
                      ? result.errors.join(" • ")
                      : `Check-in: ${result.enrolled.length} • Check-out: ${result.revoked.length}`,
                  );
                  await router.invalidate();
                  setSyncing(false);
                }}
                className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md"
              >
                <Icon name="sync" className="text-sm" />
                {syncing ? "Sincronizando…" : "Aplicar check-in / check-out"}
              </button>
              <Link
                to="/people/register"
                className="flex items-center gap-xs rounded-lg bg-secondary-container px-md py-sm text-label-md font-bold text-on-secondary-container"
              >
                <Icon name="add" className="text-sm" />
                Novo hóspede
              </Link>
            </div>
          </div>

          {message ? (
            <p className="rounded-lg bg-surface-container-high px-sm py-sm text-label-md text-primary">
              {message}
            </p>
          ) : null}

          <div className="space-y-sm">
            <MobileSearch placeholder="Buscar nome, documento ou quarto..." />
            <FilterChips
              value={stayFilter}
              onChange={setStayFilter}
              options={[
                { id: "all", label: "Qualquer estadia" },
                { id: "inStay", label: "Em estadia" },
                { id: "pending", label: "Check-in pendente" },
                { id: "checkedOut", label: "Check-out" },
              ]}
            />
          </div>

          <div className="space-y-sm">
            {guests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-xl text-center text-on-surface-variant">
                Nenhum hóspede ainda. Cadastre com foto, check-in e check-out.
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-xl text-center text-on-surface-variant">
                Nenhum hóspede com esses filtros.
              </div>
            ) : (
              visible.map((person) => (
                <article
                  key={person.id}
                  className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
                >
                  <PersonPhoto id={person.id} name={person.name} hasPhoto={person.hasPhoto} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-title-lg text-primary">{person.name}</h3>
                    <p className="text-body-md text-on-surface-variant">
                      {person.room ? `Quarto ${person.room}` : "Sem quarto"}
                      {" • "}
                      {person.cpf}
                    </p>
                  </div>
                  <div className="hidden text-right text-label-md text-on-surface-variant sm:block">
                    <div>{stayLabel(person.checkIn, person.checkOut)}</div>
                    <div>
                      {formatWhen(person.checkIn)} → {formatWhen(person.checkOut)}
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <div className="text-right text-label-md">
                      <div className={person.faceSyncedDevices > 0 ? "text-primary" : "text-on-surface-variant"}>
                        {person.faceSyncedDevices > 0 ? "Face no equipamento" : "Sem face no equipamento"}
                      </div>
                    </div>
                    <Link
                      to="/people/$id"
                      params={{ id: String(person.id) }}
                      className="rounded-lg border border-outline-variant bg-surface-container-high px-sm py-sm text-label-md text-primary transition-colors hover:bg-surface-container-highest"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === person.id}
                      aria-label={`Excluir ${person.name}`}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Excluir ${person.name}? A face será removida do Face Max e o cadastro sai do sistema.`,
                        );
                        if (!confirmed) return;
                        setDeletingId(person.id);
                        setMessage(null);
                        try {
                          const result = await deletePersonFn({ data: { id: person.id } });
                          setMessage(result.ok ? `${person.name} excluído.` : result.error);
                          await router.invalidate();
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      className="rounded-lg border border-error/30 bg-error-container px-sm py-sm text-label-md text-on-error-container transition-colors hover:brightness-95 disabled:opacity-60"
                    >
                      {deletingId === person.id ? "…" : "Excluir"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
