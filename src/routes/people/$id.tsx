import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { FaceCapture } from "@/components/FaceCapture";
import { DeviceTargetPicker } from "@/components/DeviceTargetPicker";
import { Icon } from "@/components/Icon";
import {
  getPersonFn,
  removePersonDeviceFn,
  syncPersonDeviceFn,
  updatePersonFn,
} from "@/lib/people";
import { formatCpf, formatPhone, toDateTimeInput } from "@/lib/stay";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/people/$id")({
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false as const, error: "Pessoa inválida" };
    }
    return getPersonFn({ data: { id } });
  },
  head: () => ({
    meta: [{ title: "Editar cadastro — Âncora Access" }],
  }),
  component: EditPerson,
});

const ROOM_TYPES = ["Simples", "Duplo", "Triplo", "Suíte", "Premium"] as const;

function EditPerson() {
  const loaded = Route.useLoaderData();
  const router = useRouter();
  const person = loaded.ok ? loaded.person : null;
  const [pending, setPending] = useState(false);
  const [busyDevice, setBusyDevice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(loaded.ok ? null : loaded.error);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"guest" | "staff">(person?.kind ?? "guest");
  const [documentType, setDocumentType] = useState<"cpf" | "rg" | "passport">(
    person?.documentType ?? "cpf",
  );
  const [documentNumber, setDocumentNumber] = useState(
    person?.documentType === "cpf" ? formatCpf(person.cpf) : (person?.cpf ?? ""),
  );
  const [targetAll, setTargetAll] = useState(person?.targetAll ?? true);
  const [selectedIds, setSelectedIds] = useState<number[]>(person?.deviceIds ?? []);
  const [photo, setPhoto] = useState<string | null>(
    person?.photo ? `data:${person.photo.mime};base64,${person.photo.base64}` : null,
  );
  const [photoChanged, setPhotoChanged] = useState(false);
  const [room, setRoom] = useState(person?.room ?? "");
  const [phone, setPhone] = useState(person?.phone ? formatPhone(person.phone) : "");

  const fieldClass =
    "input-glow mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary";

  useEffect(() => {
    if (!loaded.ok) return;
    setTargetAll(loaded.person.targetAll);
    setSelectedIds(loaded.person.deviceIds);
  }, [loaded]);

  if (!person) {
    return (
      <AppShell mobileTitle="Cadastro">
        <main className="p-margin-mobile md:p-margin-desktop">
          <p className="rounded-lg bg-error-container px-sm py-sm text-on-error-container">
            {error || "Pessoa não encontrada"}
          </p>
          <Link to="/people" className="mt-md inline-block text-label-md text-primary">
            Voltar
          </Link>
        </main>
      </AppShell>
    );
  }

  const devices = person.devices;

  const listTo = person.kind === "staff" ? "/staff" : "/people";

  return (
    <AppShell mobileTitle="Editar cadastro" searchPlaceholder="Buscar cadastros...">
      <form
        className="flex flex-1 flex-col"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          if (!photo) {
            setError("Capture ou carregue uma foto para o Face Max.");
            return;
          }
          if (!targetAll && selectedIds.length === 0) {
            setError("Selecione pelo menos um equipamento.");
            return;
          }
          const form = new FormData(event.currentTarget);
          setPending(true);
          try {
            const payload: Parameters<typeof updatePersonFn>[0]["data"] = {
              id: person.id,
              name: String(form.get("fullName") ?? ""),
              documentType,
              cpf: documentNumber,
              kind,
              checkIn: String(form.get("checkIn") ?? ""),
              checkOut: String(form.get("checkOut") ?? ""),
              targetAll,
              deviceIds: targetAll ? [] : selectedIds,
            };
            const roomValue = room.trim();
            const roomType = String(form.get("roomType") ?? "").trim();
            const department = String(form.get("department") ?? "").trim();
            if (roomValue) payload.room = roomValue;
            if (roomType) payload.roomType = roomType;
            if (department) payload.department = department;
            if (kind === "guest") payload.phone = phone;
            if (photoChanged && photo) {
              payload.photoBase64 = photo;
              payload.photoMime = "image/jpeg";
            }
            const result = await updatePersonFn({ data: payload });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            if (result.stay.errors.length) {
              setError(result.stay.errors.join(" • "));
            } else {
              setMessage("Cadastro atualizado.");
            }
            await router.invalidate();
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
              <Link to={listTo} className="hover:text-primary">
                {person.kind === "staff" ? "Funcionários" : "Hóspedes"}
              </Link>
              <Icon name="chevron_right" className="text-sm" />
              <span className="font-bold text-primary">Editar</span>
            </div>
            <h2 className="text-headline-lg tracking-tight text-primary">Editar {person.name}</h2>
            <p className="mt-base text-body-md text-on-surface-variant">
              Altere o cadastro, sincronize ou remova a face de um Face Max.
            </p>
          </div>
          <div className="flex gap-sm">
            <Link
              to={listTo}
              className="flex h-12 items-center justify-center rounded-lg border border-outline bg-surface-container-lowest px-md text-sm font-semibold text-primary"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary disabled:opacity-70"
            >
              {pending ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 items-start gap-gutter p-margin-mobile md:p-margin-desktop lg:grid-cols-12">
          <div className="space-y-gutter lg:col-span-8">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Dados pessoais</h3>
              <div className="space-y-md">
                <label className="block text-label-md text-on-surface-variant">
                  Nome completo
                  <input name="fullName" required defaultValue={person.name} className={fieldClass} />
                </label>
                <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                  <label className="block text-label-md text-on-surface-variant">
                    Tipo de documento
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
                    Número do documento
                    <input
                      required
                      value={documentNumber}
                      onChange={(event) =>
                        setDocumentNumber(
                          documentType === "cpf" ? formatCpf(event.target.value) : event.target.value,
                        )
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                {kind === "guest" ? (
                  <label className="block text-label-md text-on-surface-variant">
                    WhatsApp
                    <input
                      required
                      value={phone}
                      onChange={(event) => setPhone(formatPhone(event.target.value))}
                      placeholder="(11) 99999-9999"
                      inputMode="tel"
                      autoComplete="tel"
                      className={fieldClass}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">
                {person.kind === "staff" ? "Vigência no Face Max" : "Período da estadia"}
              </h3>
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <label className="block text-label-md text-on-surface-variant">
                  {person.kind === "staff" ? "Início (data e hora)" : "Check-in (data e hora)"}
                  <input
                    name="checkIn"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeInput(person.checkIn)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-label-md text-on-surface-variant">
                  {person.kind === "staff" ? "Fim (data e hora)" : "Check-out (data e hora)"}
                  <input
                    name="checkOut"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeInput(person.checkOut)}
                    className={fieldClass}
                  />
                </label>
              </div>
            </section>

            {person.kind === "staff" ? (
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
                <h3 className="mb-md text-title-lg text-primary">Setor</h3>
                <label className="block text-label-md text-on-surface-variant">
                  Setor / função
                  <input name="department" defaultValue={person.department ?? ""} className={fieldClass} />
                </label>
              </section>
            ) : (
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Quarto</h3>
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <label className="block text-label-md text-on-surface-variant">
                  Tipo de quarto
                  <select name="roomType" defaultValue={person.roomType || "Simples"} className={fieldClass}>
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-label-md text-on-surface-variant">
                  Número do quarto
                  <input value={room} onChange={(event) => setRoom(event.target.value)} className={fieldClass} />
                </label>
              </div>
            </section>
            )}

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Equipamentos</h3>
              <p className="mb-md text-body-md text-on-surface-variant">
                Sincroniza a face neste Face Max ou remove só deste equipamento.
              </p>
              {devices.length === 0 ? (
                <p className="text-label-md text-on-surface-variant">Nenhum equipamento cadastrado.</p>
              ) : (
                <ul className="space-y-sm">
                  {devices.map((device) => (
                    <li
                      key={device.id}
                      className="flex flex-col gap-sm rounded-lg border border-outline-variant px-md py-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-body-md font-medium text-primary">
                          {device.location || device.name}
                        </p>
                        <p className="text-label-md text-on-surface-variant">
                          {device.faceSynced
                            ? "Face no equipamento"
                            : device.mapped
                              ? device.lastError || "Sem face"
                              : "Não está neste equipamento"}
                        </p>
                      </div>
                      <div className="flex gap-sm">
                        <button
                          type="button"
                          disabled={busyDevice === device.id || pending}
                          onClick={async () => {
                            setBusyDevice(device.id);
                            setError(null);
                            setMessage(null);
                            try {
                              const result = await syncPersonDeviceFn({
                                data: { personId: person.id, deviceId: device.id },
                              });
                              if (!result.ok) setError(result.error);
                              else setMessage(`Sincronizado em ${device.location || device.name}.`);
                              await router.invalidate();
                            } finally {
                              setBusyDevice(null);
                            }
                          }}
                          className="rounded-lg border border-outline-variant bg-surface-container-high px-sm py-sm text-label-md text-primary disabled:opacity-60"
                        >
                          {busyDevice === device.id ? "…" : "Sincronizar"}
                        </button>
                        <button
                          type="button"
                          disabled={busyDevice === device.id || pending}
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const confirmed = window.confirm(
                              `Remover ${person.name} de ${device.location || device.name}? A face sai só deste Face Max.`,
                            );
                            if (!confirmed) return;
                            setBusyDevice(device.id);
                            setError(null);
                            setMessage(null);
                            try {
                              const result = await removePersonDeviceFn({
                                data: { personId: person.id, deviceId: device.id },
                              });
                              if (!result.ok) setError(result.error);
                              else setMessage(`Removido de ${device.location || device.name}.`);
                              await router.invalidate();
                            } finally {
                              setBusyDevice(null);
                            }
                          }}
                          className="rounded-lg border border-error/30 bg-error-container px-sm py-sm text-label-md text-on-error-container disabled:opacity-60"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-gutter lg:col-span-4">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Foto para o Face Max</h3>
              <FaceCapture
                value={photo}
                onChange={(value) => {
                  setPhoto(value);
                  setPhotoChanged(true);
                }}
              />
            </section>
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
              <h3 className="mb-md text-title-lg text-primary">Destino da biometria</h3>
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
          </aside>
        </div>

        {message ? (
          <div className="px-margin-mobile pb-sm md:px-margin-desktop">
            <p className="rounded-lg bg-surface-container-high px-sm py-sm text-label-md text-primary">
              {message}
            </p>
          </div>
        ) : null}
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
