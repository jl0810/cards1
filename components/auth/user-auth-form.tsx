"use client"

import * as React from "react"
import { signIn } from "next-auth/react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }


export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false)
  const [isAppleLoading, setIsAppleLoading] = React.useState<boolean>(false)
  const [emailSent, setEmailSent] = React.useState<boolean>(false)
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

      setEmailSent(true)
    } catch (err) {
      setIsLoading(false)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {emailSent ? (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
          <p className="text-sm font-medium text-green-400">Check your email!</p>
          <p className="text-xs text-green-300/70 mt-1">
            We sent you a magic link to sign in. Click the link in your email to continue.
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
                disabled={isLoading || isGoogleLoading || isAppleLoading}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              className={cn(buttonVariants())}
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In with Email
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
