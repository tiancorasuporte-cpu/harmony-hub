import { createFileRoute } from "@tanstack/react-router";

import { PersonRegisterForm } from "@/components/PersonRegisterForm";
import { listDeviceOptionsFn } from "@/lib/people";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/staff/register")({
  beforeLoad: requireAuth,
  loader: () => listDeviceOptionsFn(),
  head: () => ({
    meta: [{ title: "Cadastrar funcionário — Âncora Access" }],
  }),
  component: RegisterStaff,
});

function RegisterStaff() {
  return <PersonRegisterForm kind="staff" devices={Route.useLoaderData()} />;
}
