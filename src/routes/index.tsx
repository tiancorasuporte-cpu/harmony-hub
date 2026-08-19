import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { redirectIfAuthenticated } from "@/lib/require-auth";
import { loginFn } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: redirectIfAuthenticated,
  head: () => ({
    meta: [
      { title: "Entrar — Âncora Access" },
      {
        name: "description",
        content: "Acesse a suíte Âncora Access para gerenciar equipamentos, presença e permissões.",
      },
      { property: "og:title", content: "Entrar — Âncora Access" },
      {
        property: "og:description",
        content: "Acesse a suíte Âncora Access.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-margin-mobile md:p-margin-desktop">
      <main className="flex w-full max-w-[420px] flex-col items-center rounded-lg border border-surface-variant bg-surface-container-lowest p-xl">
        <header className="mb-xl flex w-full flex-col items-center border-b border-surface-variant pb-lg">
          <div className="mb-md flex h-[120px] w-[120px] items-center justify-center">
            <BrandLogo className="max-h-full max-w-full" />
          </div>
          <h1 className="text-center text-headline-md tracking-tight text-primary">
            Âncora Access
          </h1>
          <p className="mt-base text-center text-body-md text-on-surface-variant">
            Suíte de gestão
          </p>
        </header>

        <form
          className="flex w-full flex-col gap-lg"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            try {
              const result = await loginFn({
                data: {
                  username: String(form.get("username") ?? ""),
                  password: String(form.get("password") ?? ""),
                },
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              await navigate({ to: "/monitoring" });
            } catch {
              setError("Não foi possível conectar ao servidor. Tente novamente.");
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="flex flex-col gap-base">
            <label className="text-label-md text-primary" htmlFor="username">
              Usuário
            </label>
            <div className="relative">
              <Icon
                name="person"
                className="absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
              />
              <input
                id="username"
                name="username"
                type="text"
                required
                placeholder="Digite seu usuário"
                className="input-glow w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-sm pl-xl pr-sm text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-base">
            <label className="text-label-md text-primary" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <Icon
                name="lock"
                className="absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Digite sua senha"
                className="input-glow w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-sm pl-xl pr-xl text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-error-container px-sm py-sm text-label-md text-on-error-container">
              {error}
            </p>
          ) : null}

          <div className="mt-sm flex w-full flex-col gap-md">
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary-container px-lg py-sm text-body-lg font-semibold text-primary shadow-elevation-1 transition-colors hover:bg-secondary-fixed disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Entrando..." : "Acessar"}
              <Icon name="arrow_forward" className="text-[20px]" />
            </button>
            <div className="mt-base flex w-full justify-center">
              <a
                href="#"
                className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
              >
                Esqueceu a senha?
              </a>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
