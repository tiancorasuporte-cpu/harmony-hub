import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { FaceCapture } from "@/components/FaceCapture";
import { DeviceTargetPicker } from "@/components/DeviceTargetPicker";
import { Icon } from "@/components/Icon";
import { createPersonFn, listDeviceOptionsFn, lookupRoomFn } from "@/lib/people";
import { formatCpf, toDateTimeInput } from "@/lib/stay";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/people/register")({
  beforeLoad: requireAuth,
  loader: () => listDeviceOptionsFn(),
  head: () => ({
    meta: [{ title: "Person Registration — Âncora Access" }],
  }),
  component: RegisterPerson,
});

const ROOM_TYPES = ["Simples", "Duplo", "Triplo", "Suíte", "Premium"] as const;

function defaultCheckOut() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

function RegisterPerson() {
  const devices = Route.useLoaderData();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"guest" | "staff">("guest");
  const [documentType, setDocumentType] = useState<"cpf" | "rg" | "passport">("cpf");
  const [documentNumber, setDocumentNumber] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [room, setRoom] = useState("");
  const [roomNote, setRoomNote] = useState<string | null>(null);

  const fieldClass =
    "input-glow mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary";

  const checkInDefault = useMemo(() => toDateTimeInput(new Date()), []);
  const checkOutDefault = useMemo(() => toDateTimeInput(defaultCheckOut()), []);

  return (
    <AppShell mobileTitle="Registration" searchPlaceholder="Search records...">
      <form
        className="flex flex-1 flex-col"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          if (!photo) {
            setError("Capture ou carregue uma foto para enviar ao Face Max.");
            return;
          }
          if (!targetAll && selectedIds.length === 0) {
            setError("Selecione pelo menos um equipamento.");
            return;
          }
          const form = new FormData(event.currentTarget);
          setPending(true);
          try {
            const payload: Parameters<typeof createPersonFn>[0]["data"] = {
              name: String(form.get("fullName") ?? ""),
              documentType,
              cpf: documentNumber,
              kind,
              checkIn: String(form.get("checkIn") ?? ""),
              checkOut: String(form.get("checkOut") ?? ""),
              targetAll,
              deviceIds: targetAll ? [] : selectedIds,
              photoBase64: photo,
              photoMime: "image/jpeg",
            };
            const roomValue = room.trim();
            const roomType = String(form.get("roomType") ?? "").trim();
            const department = String(form.get("department") ?? "").trim();
            if (roomValue) payload.room = roomValue;
            if (roomType) payload.roomType = roomType;
            if (department) payload.department = department;

            const result = await createPersonFn({ data: payload });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            if (result.stay.errors.length) {
              setError(result.stay.errors.join(" • "));
              return;
            }
            await navigate({ to: "/people" });
          } catch {
            setError("Não foi possível salvar o cadastro.");
          } finally {
            setPending(false);
          }
        }}
      >
        <header className="flex flex-col gap-md border-b border-outline-variant bg-background px-margin-mobile py-lg md:flex-row md:items-end md:justify-between md:px-margin-desktop">
          <div>
            <div className="mb-xs flex items-center gap-xs text-label-md text-on-surface-variant">
              <Link to="/people" className="hover:text-primary">
                People
              </Link>
              <Icon name="chevron_right" className="text-sm" />
              <span className="font-bold text-primary">Registration</span>
            </div>
            <h2 className="text-headline-lg tracking-tight text-primary">Person Registration</h2>
            <p className="mt-base text-body-md text-on-surface-variant">
              A foto vai para o Face Max no check-in e é apagada no check-out.
            </p>
          </div>
          <div className="flex gap-sm">
            <Link
              to="/people"
              className="flex h-12 items-center justify-center rounded-lg border border-outline bg-surface-container-lowest px-md text-sm font-semibold text-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary disabled:opacity-70"
            >
              {pending ? "Saving…" : "Save Registration"}
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 items-start gap-gutter p-margin-mobile md:p-margin-desktop lg:grid-cols-12">
          <div className="space-y-gutter lg:col-span-8">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Personal Information</h3>
              <div className="space-y-md">
                <label className="block text-label-md text-on-surface-variant">
                  Full Name
                  <input name="fullName" required className={fieldClass} />
                </label>
                <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                  <label className="block text-label-md text-on-surface-variant">
                    Document Type
                    <select
                      className={fieldClass}
                      value={documentType}
                      onChange={(event) => {
                        setDocumentType(event.target.value as "cpf" | "rg" | "passport");
                        setDocumentNumber("");
                      }}
                    >
                      <option value="cpf">CPF</option>
                      <option value="rg">RG</option>
                      <option value="passport">Passaporte</option>
                    </select>
                  </label>
                  <label className="block text-label-md text-on-surface-variant">
                    Document Number
                    <input
                      required
                      value={documentNumber}
                      onChange={(event) =>
                        setDocumentNumber(
                          documentType === "cpf" ? formatCpf(event.target.value) : event.target.value,
                        )
                      }
                      placeholder={documentType === "cpf" ? "000.000.000-00" : "Número"}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Access Period</h3>
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <label className="block text-label-md text-on-surface-variant">
                  Check-in (data e hora)
                  <input
                    name="checkIn"
                    type="datetime-local"
                    required
                    defaultValue={checkInDefault}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-label-md text-on-surface-variant">
                  Check-out (data e hora)
                  <input
                    name="checkOut"
                    type="datetime-local"
                    required
                    defaultValue={checkOutDefault}
                    className={fieldClass}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Room Selection</h3>
              <div className="grid grid-cols-1 gap-md md:grid-cols-[1fr_1fr_auto]">
                <label className="block text-label-md text-on-surface-variant">
                  Tipo de Quarto
                  <select name="roomType" defaultValue="Simples" className={fieldClass}>
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-label-md text-on-surface-variant">
                  Número do Quarto
                  <input
                    value={room}
                    onChange={(event) => setRoom(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!room.trim()) return;
                    const result = await lookupRoomFn({ data: { room: room.trim() } });
                    setRoomNote(
                      result.ok
                        ? `Quarto encontrado: ${result.person.name}`
                        : result.error,
                    );
                  }}
                  className="mt-auto flex h-[46px] items-center justify-center gap-xs rounded-lg bg-secondary-container px-md text-sm font-bold text-on-secondary-container"
                >
                  <Icon name="search" className="text-sm" />
                  Puxar Quarto
                </button>
              </div>
              {roomNote ? <p className="mt-sm text-label-md text-on-surface-variant">{roomNote}</p> : null}
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Access Level</h3>
              <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
                {(
                  [
                    { id: "guest", label: "Guest (Standard)" },
                    { id: "staff", label: "Staff (Restricted)" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setKind(option.id)}
                    className={`rounded-xl border px-md py-md text-left ${
                      kind === option.id
                        ? "border-secondary-container bg-secondary-fixed/30 font-bold text-primary"
                        : "border-outline-variant text-on-surface"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {kind === "staff" ? (
                <label className="mt-md block text-label-md text-on-surface-variant">
                  Department
                  <input name="department" className={fieldClass} />
                </label>
              ) : null}
            </section>
          </div>

          <aside className="space-y-gutter lg:col-span-4">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Identity Verification</h3>
              <FaceCapture value={photo} onChange={setPhoto} />
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Destino da Biometria</h3>
              <DeviceTargetPicker
                devices={devices}
                targetAll={targetAll}
                selectedIds={selectedIds}
                onChange={(next) => {
                  setTargetAll(next.targetAll);
                  setSelectedIds(next.selectedIds);
                }}
              />
            </section>

            <div className="rounded-lg bg-secondary-fixed/40 px-md py-sm text-label-md text-on-surface-variant">
              Clear, well-lit photos improve facial recognition accuracy for automated access points.
            </div>
          </aside>
        </div>

        {error ? (
          <div className="px-margin-mobile pb-lg md:px-margin-desktop">
            <p className="rounded-lg bg-error-container px-sm py-sm text-label-md text-on-error-container">
              {error}
            </p>
          </div>
        ) : null}
      </form>
    </AppShell>
  );
}
