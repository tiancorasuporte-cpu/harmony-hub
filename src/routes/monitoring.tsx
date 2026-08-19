import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, useShellSearch } from "@/components/AppShell";
import { FilterChips, MobileSearch } from "@/components/FilterBar";
import { Icon } from "@/components/Icon";
import { PersonPhoto } from "@/components/PersonPhoto";
import { formatWhen } from "@/lib/format";
import { listPresenceFn } from "@/lib/monitoring";
import { requireAuth } from "@/lib/require-auth";
import { matchesQuery } from "@/lib/text-search";

export const Route = createFileRoute("/monitoring")({
  beforeLoad: requireAuth,
  loader: () => listPresenceFn(),
  head: () => ({
    meta: [
      { title: "Active Presence — Âncora Access" },
      {
        name: "description",
        content:
          "See who is currently on premises across all zones, with check-in times for guests and staff.",
      },
    ],
  }),
  component: Monitoring,
});

function Monitoring() {
  const people = Route.useLoaderData();
  const { query } = useShellSearch();
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "guest" | "staff">("all");
  const active = people.filter((person) => person.status === "Active").length;

  const visible = useMemo(() => {
    return people.filter((person) => {
      if (statusFilter !== "all" && person.status !== statusFilter) return false;
      if (kindFilter !== "all" && person.kind !== kindFilter) return false;
      return matchesQuery(query, [person.name, person.role, person.lastDevice, person.status, person.kind]);
    });
  }, [people, query, statusFilter, kindFilter]);

  return (
    <AppShell mobileTitle="Presence" searchPlaceholder="Buscar pessoa, quarto, função ou equipamento...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-7xl space-y-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Active Presence</h2>
              <p className="mt-base text-body-lg text-on-surface-variant">
                Presence from Control iD Face Max access logs. {active} active now.
              </p>
            </div>
          </div>

          <div className="space-y-sm">
            <MobileSearch placeholder="Buscar pessoa, quarto, função ou equipamento..." />
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
              <h3 className="text-title-lg text-primary">No people yet</h3>
              <p className="mt-base text-body-md text-on-surface-variant">
                Add guests or staff, then sync them to a Face Max. Access events will show up here.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center text-on-surface-variant">
              Nenhuma presença com esses filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((person) => (
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
                      {person.status}
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
