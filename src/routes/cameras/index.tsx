import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

import { AppShell, useShellSearch } from "@/components/AppShell";
import { CameraMosaic, mosaicClass } from "@/components/CameraMosaic";
import { Icon } from "@/components/Icon";
import { createCameraFn, deleteCameraFn, listCamerasFn, updateCameraFn } from "@/lib/cameras";
import { requireCamerasModule } from "@/lib/require-auth";
import { matchesQuery } from "@/lib/text-search";

export const Route = createFileRoute("/cameras/")({
  beforeLoad: requireCamerasModule,
  loader: () => listCamerasFn(),
  head: () => ({
    meta: [{ title: "Câmeras — Âncora Access" }],
  }),
  component: Cameras,
});

function Cameras() {
  const cameras = Route.useLoaderData();
  const router = useRouter();
  const { query } = useShellSearch();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldClass =
    "input-glow mt-base w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary";

  const visible = useMemo(
    () => cameras.filter((camera) => matchesQuery(query, [camera.name, camera.url])),
    [cameras, query],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = editingId
        ? await updateCameraFn({ data: { id: editingId, name, url } })
        : await createCameraFn({ data: { name, url } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setUrl("");
      setEditingId(null);
      await router.invalidate();
    } catch {
      setError("Não foi possível salvar a câmera.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell mobileTitle="Câmeras" searchPlaceholder="Buscar câmera...">
      <main className="flex-1 p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto max-w-[90rem] space-y-lg">
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-headline-lg tracking-tight text-primary">Câmeras</h2>
              <p className="mt-base text-body-lg text-on-surface-variant">
                Cadastre o nome e o link da Zeus Vision. O mosaico mostra todas as câmeras do hotel.
              </p>
            </div>
            {cameras.length > 0 ? (
              <a
                href="/cameras/mosaic"
                target="_blank"
                rel="noreferrer"
                className="flex h-12 shrink-0 items-center justify-center gap-xs rounded-lg bg-secondary-container px-md text-sm font-bold text-on-secondary-container shadow-elevation-1 hover:bg-secondary-fixed"
              >
                <Icon name="open_in_new" className="text-sm" />
                Abrir mosaico em nova aba
              </a>
            ) : null}
          </div>

          <form
            onSubmit={(event) => void save(event)}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
          >
            <h3 className="mb-md text-title-lg text-primary">
              {editingId ? "Editar câmera" : "Adicionar câmera"}
            </h3>
            <div className="grid grid-cols-1 gap-md lg:grid-cols-[minmax(12rem,18rem)_1fr_auto]">
              <label className="block text-label-md text-on-surface-variant">
                Nome
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Recepção, garagem…"
                  className={fieldClass}
                />
              </label>
              <label className="block text-label-md text-on-surface-variant">
                Link
                <input
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://rtspserver.zeusvision.com.br/…"
                  className={fieldClass}
                />
              </label>
              <div className="flex items-end gap-sm">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex h-12 items-center justify-center rounded-lg bg-primary px-md text-sm font-semibold text-on-primary disabled:opacity-70"
                >
                  {pending ? "Salvando…" : editingId ? "Salvar" : "Adicionar"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setName("");
                      setUrl("");
                    }}
                    className="flex h-12 items-center justify-center rounded-lg border border-outline px-md text-sm font-semibold text-primary"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
            {error ? (
              <p className="mt-md rounded-lg bg-error-container px-sm py-sm text-label-md text-on-error-container">
                {error}
              </p>
            ) : null}
          </form>

          {cameras.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant p-xl text-center text-on-surface-variant">
              Nenhuma câmera ainda. Cole o link da Zeus Vision e adicione a primeira.
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant p-xl text-center text-on-surface-variant">
              Nenhuma câmera com essa busca.
            </div>
          ) : (
            <div className={`grid gap-gutter ${mosaicClass(visible.length)}`}>
              {visible.map((camera) => (
                <article
                  key={camera.id}
                  className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
                >
                  <div className="flex items-center justify-between gap-sm px-md py-sm">
                    <h3 className="truncate text-title-lg text-primary">{camera.name}</h3>
                    <div className="flex shrink-0 items-center gap-xs">
                      <a
                        href={camera.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-xs text-label-md font-semibold text-primary hover:bg-surface-container-high"
                      >
                        <Icon name="open_in_new" className="text-sm" />
                        Nova aba
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(camera.id);
                          setName(camera.name);
                          setUrl(camera.url);
                        }}
                        className="rounded-lg px-sm py-xs text-label-md text-on-surface-variant hover:bg-surface-container-high"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm(`Remover ${camera.name} do mosaico?`);
                          if (!confirmed) return;
                          await deleteCameraFn({ data: { id: camera.id } });
                          if (editingId === camera.id) {
                            setEditingId(null);
                            setName("");
                            setUrl("");
                          }
                          await router.invalidate();
                        }}
                        className="rounded-lg px-sm py-xs text-label-md text-error hover:bg-error-container"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-inverse-surface">
                    <iframe
                      title={camera.name}
                      src={camera.url}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="autoplay; fullscreen; encrypted-media"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
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
