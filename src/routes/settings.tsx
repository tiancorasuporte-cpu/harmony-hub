import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { getOverviewFn } from "@/lib/monitoring";
import { isAdmin, requireAuth } from "@/lib/require-auth";
import { Route as RootRoute } from "@/routes/__root";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  loader: () => getOverviewFn(),
  head: () => ({
    meta: [{ title: "Settings — Âncora Access" }],
  }),
  component: Settings,
});

function Settings() {
  const overview = Route.useLoaderData();
  const { user } = RootRoute.useRouteContext();
  const admin = isAdmin(user);

  const cards = [
    ...(admin ? [{ label: "Devices", value: overview.devices, to: "/devices" as const }] : []),
    { label: "People", value: overview.people, to: "/people" as const },
    { label: "Active now", value: overview.active, to: "/monitoring" as const },
    { label: "Access events", value: overview.events, to: "/monitoring" as const },
    ...(admin ? [{ label: "Usuários", value: "→", to: "/users" as const }] : []),
  ];

  return (
    <AppShell mobileTitle="Settings">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-4xl space-y-lg">
          <div>
            <h2 className="text-headline-lg tracking-tight text-primary">Settings</h2>
            <p className="mt-base text-body-lg text-on-surface-variant">
              PostgreSQL and Control iD Face Max integration status.
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

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-sm flex items-center gap-xs text-title-lg text-primary">
              <Icon name="face" className="text-secondary" />
              Control iD Face Max
            </h3>
            <p className="text-body-md text-on-surface-variant">
              Integration uses the Access Line REST API in standalone mode: login, create users,
              enroll faces from photos, and pull access logs. Documentation:{" "}
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
        </div>
      </main>
    </AppShell>
  );
}
