import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Âncora Access" },
      {
        name: "description",
        content:
          "Sign in to the Âncora Access management suite to manage access devices, presence and permissions.",
      },
      { property: "og:title", content: "Sign in — Âncora Access" },
      {
        property: "og:description",
        content: "Sign in to the Âncora Access management suite.",
      },
    ],
  }),
  component: Login,
});

const LOGO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDGIYdFe-QTReeYPEhQ2FoOjOdFDNc4HSdeEdTZ6H06dDI_U4iS1Ly-uFGOgfwNRTDPj8BRVoZbCtfrGlSE99UzLikPlFSGss9K4rfu3Uk1D4chO9SFEF8Rv0SoOuPg2g4Z6rBZp3SKTWk-39yokraWTtFjZDi2K8eaUJ2vgxH3kHKwd9zhD8MgT0323eCVUWCjg42Fl1EbDy9Kckkj5JWelJjlu1CMd-MG5Bl6ZsA8y-flSmVG-kSD-PsJDFrpIrSaiRo";

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-margin-mobile md:p-margin-desktop">
      <main className="flex w-full max-w-[420px] flex-col items-center rounded-lg border border-surface-variant bg-surface-container-lowest p-xl">
        <header className="mb-xl flex w-full flex-col items-center border-b border-surface-variant pb-lg">
          <div className="mb-md flex h-[120px] w-[120px] items-center justify-center">
            <img
              src={LOGO}
              alt="Âncora Access logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <h1 className="text-center text-headline-md tracking-tight text-primary">
            Âncora Access
          </h1>
          <p className="mt-base text-center text-body-md text-on-surface-variant">
            Management Suite
          </p>
        </header>

        <form
          className="flex w-full flex-col gap-lg"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/monitoring" });
          }}
        >
          <div className="flex flex-col gap-base">
            <label className="text-label-md text-primary" htmlFor="username">
              Username
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
                placeholder="Enter your username"
                className="input-glow w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-sm pl-xl pr-sm text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-base">
            <label className="text-label-md text-primary" htmlFor="password">
              Password
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
                placeholder="Enter your password"
                className="input-glow w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-sm pl-xl pr-xl text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
              </button>
            </div>
          </div>

          <div className="mt-sm flex w-full flex-col gap-md">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary-container px-lg py-sm text-body-lg font-semibold text-primary shadow-elevation-1 transition-colors hover:bg-secondary-fixed"
            >
              Acessar
              <Icon name="arrow_forward" className="text-[20px]" />
            </button>
            <div className="mt-base flex w-full justify-center">
              <a
                href="#"
                className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
              >
                Forgot your password?
              </a>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
