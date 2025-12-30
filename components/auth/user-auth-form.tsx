"use client"

import * as React from "react"
import { signIn } from "next-auth/react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  isSignUp?: boolean
}


export function UserAuthForm({ className, isSignUp, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false)
  const [isAppleLoading, setIsAppleLoading] = React.useState<boolean>(false)
  const [emailSent, setEmailSent] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget as HTMLFormElement)
    const email = formData.get("email") as string

    try {
      const signInResult = await signIn("email", {
        email: email.toLowerCase(),
        redirect: false,
        callbackUrl: "/dashboard",
      })

      setIsLoading(false)

      if (!signInResult?.ok) {
        setError(signInResult?.error || "Failed to send email. Please try again.")
        return
      }

      setEmailSent(email)
    } catch (err) {
      setIsLoading(false)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-2 text-center mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create an account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignUp
            ? "Enter your email below to create your account"
            : "Sign in with your favorite provider"}
        </p>
      </div>

      {emailSent ? (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
          <p className="text-sm font-medium text-green-400">Check your email!</p>
          <p className="text-xs text-green-300/70 mt-1">
            We sent a magic link to <strong>{emailSent}</strong>. Click the link to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-2">
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {isSignUp && (
              <div className="grid gap-1 mb-2">
                <label className="sr-only" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="name"
                  disabled={isLoading || isGoogleLoading || isAppleLoading}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            <div className="grid gap-1">
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                required
                disabled={isLoading || isGoogleLoading || isAppleLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              className={cn(buttonVariants(), "bg-cyan-600 hover:bg-cyan-700 text-white mt-2")}
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSignUp ? "Create Account" : "Sign In with Email"}
            </button>
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
            setIsGoogleLoading(true)
            signIn("google")
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
            setIsAppleLoading(true)
            signIn("apple")
          }}
          disabled={isLoading || isGoogleLoading || isAppleLoading}
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
  )
}
