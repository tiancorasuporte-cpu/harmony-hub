import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import {
  LoginShell,
  loginFieldClass,
  loginFieldWithToggleClass,
  loginSubmitClass,
} from "@/components/LoginShell";
import { redirectIfAuthenticated } from "@/lib/require-auth";
import { loginFn } from "@/lib/auth";

type LoginSearch = {
  hotel?: string;
};

export const Route = createFileRoute("/")({
  beforeLoad: redirectIfAuthenticated,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    hotel: typeof search.hotel === "string" ? search.hotel.trim() : undefined,
  }),
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
  const { hotel: hotelFromLink } = Route.useSearch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [exiting, setExiting] = useState(false);

  return (
    <LoginShell
      title="Bem-vindo"
      subtitle="Entre com o código da unidade e suas credenciais."
      exiting={exiting}
    >
      <form
        className="flex w-full flex-col gap-md"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          const form = new FormData(event.currentTarget);
          const hotelSlug = String(form.get("hotelSlug") ?? "").trim();
          try {
            const result = await loginFn({
              data: {
                username: String(form.get("username") ?? ""),
                password: String(form.get("password") ?? ""),
                hotelSlug,
              },
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            const { markLoginEnter, wait } = await import("@/lib/login-enter");
            markLoginEnter();
            setExiting(true);
            await wait(900);
            await navigate({ to: result.hotelId ? "/monitoring" : "/hotels" });
          } catch {
            setError("Não foi possível conectar ao servidor. Tente novamente.");
            setExiting(false);
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="flex flex-col gap-base">
          <label className="text-label-md font-medium text-primary" htmlFor="hotelSlug">
            Código da unidade
          </label>
          <div className="relative">
            <Icon
              name="apartment"
              className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="hotelSlug"
              name="hotelSlug"
              type="text"
              required
              defaultValue={hotelFromLink ?? ""}
              autoComplete="organization"
              placeholder="Ex.: hotel-centro"
              className={loginFieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-base">
          <label className="text-label-md font-medium text-primary" htmlFor="username">
            Usuário
          </label>
          <div className="relative">
            <Icon
              name="person"
              className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="Seu usuário"
              className={loginFieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-base">
          <label className="text-label-md font-medium text-primary" htmlFor="password">
            Senha
          </label>
          <div className="relative">
            <Icon
              name="lock"
              className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Sua senha"
              className={loginFieldWithToggleClass}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-sm top-1/2 -translate-y-1/2 rounded-md p-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-error-container px-md py-sm text-label-md text-on-error-container"
          >
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={loginSubmitClass}>
          {pending ? "Entrando..." : "Acessar suíte"}
          <Icon
            name="arrow_forward"
            className="text-[20px] transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </form>
    </LoginShell>
  );
}
