"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { CSSLogo } from "@/components/shared/css-logo";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  isSignUp?: boolean;
}

export function UserAuthForm({
  className,
  isSignUp,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const [isGitHubLoading, setIsGitHubLoading] = React.useState<boolean>(false);
  const [isAppleLoading, setIsAppleLoading] = React.useState<boolean>(false);
  const [emailSent, setEmailSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;

    try {
      const signInResult = await signIn("email", {
        email: email.toLowerCase(),
        redirect: false,
        callbackUrl: "/dashboard",
      });

      setIsLoading(false);

      if (!signInResult?.ok) {
        setError(
          signInResult?.error || "Failed to send email. Please try again.",
        );
        return;
      }

      setEmailSent(email);
    } catch (_err) {
      setIsLoading(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-8 text-center mb-10">
        <div className="mx-auto flex items-center justify-center pt-2">
          <CSSLogo className="scale-110 sm:scale-125" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </h1>
          <p className="text-muted-foreground">
            {isSignUp
              ? "Join the craziness today"
              : "Welcome back to the dashboard"}
          </p>
        </div>
      </div>

      {emailSent ? (
        <div className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 mb-4">
            <Icons.check className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Check your inbox!
          </h3>
          <p className="text-sm text-cyan-100/70">
            We sent a secure magic link to:
          </p>
          <div className="my-3 rounded bg-background/50 py-2 px-3 inline-block border border-cyan-500/30">
            <span className="text-sm font-mono text-cyan-300">{emailSent}</span>
          </div>
          <p className="text-xs text-cyan-100/50 mt-4 leading-relaxed">
            Click the link in the email to verify your identity
            <br />
            and complete your {isSignUp ? "registration" : "sign in"}.
          </p>
          <button
            onClick={() => setEmailSent(null)}
            className="mt-6 text-xs text-cyan-400 hover:underline underline-offset-4"
          >
            Mistake? Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center animate-in shake duration-300">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="grid gap-2">
              {isSignUp && (
                <div className="grid gap-1 mb-2">
                  <label
                    className="text-xs font-medium text-slate-400 ml-1"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Jeff Cards"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    disabled={isLoading || isGoogleLoading || isAppleLoading}
                    required
                    className="flex h-11 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              )}

              <div className="grid gap-1">
                <label
                  className="text-xs font-medium text-slate-400 ml-1"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  placeholder="jeff@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  required
                  disabled={isLoading || isGoogleLoading || isAppleLoading}
                  className="flex h-11 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            </div>

            <button
              className={cn(
                buttonVariants(),
                "h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-lg shadow-cyan-900/20",
              )}
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSignUp ? "Continue to Verification" : "Send Magic Link"}
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-2">
              v1.0.4 • Built with CGC Cloud Sync
            </p>
          </div>
        </form>
      )}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsGoogleLoading(true);
            void signIn("google");
          }}
          disabled={isLoading || isGoogleLoading || isAppleLoading}
        >
          {isGoogleLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}{" "}
          Google
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsGitHubLoading(true);
            void signIn("github");
          }}
          disabled={isLoading || isGoogleLoading || isGitHubLoading || isAppleLoading}
        >
          {isGitHubLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.gitHub className="mr-2 h-4 w-4" />
          )}{" "}
          GitHub
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsAppleLoading(true);
            void signIn("apple");
          }}
          disabled={isLoading || isGoogleLoading || isGitHubLoading || isAppleLoading}
        >
          {isAppleLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.apple className="mr-2 h-4 w-4" />
          )}{" "}
          Apple
        </button>
      </div>
    </div>
  );
}
