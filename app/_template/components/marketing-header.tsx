"use client";


import * as React from "react"; // <-- Import all as React
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Rocket, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion"; // <-- Import motion and AnimatePresence


// Use Next.js Link and forward the ref
const LinkComponent = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof Link>
>((props, ref) => <Link ref={ref} {...props} />);
LinkComponent.displayName = "LinkComponent";


export function MarketingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);


  const navLinks = [
    { href: "/pricing", label: "Pricing" },
    { href: "/#features", label: "Features" },
    { href: "/contact", label: "Contact" },
  ];


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Desktop Nav */}
        <div className="flex items-center gap-6">
          <LinkComponent href="/" className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">SaaS Kit</span>
          </LinkComponent>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <LinkComponent
                key={link.href}
                href={link.href}
                className="font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </LinkComponent>
            ))}
          </nav>
        </div>


        {/* Mobile Menu Button */}
        <button
          className="md:hidden rounded-md p-2 text-muted-foreground transition-all hover:bg-muted"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>


        {/* Desktop Auth & Theme */}
        <div className="hidden md:flex items-center justify-end gap-3">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign Up</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <LinkComponent href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </LinkComponent>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>


      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn(
              "md:hidden absolute top-16 left-0 w-full bg-background border-t border-border shadow-lg overflow-hidden"
            )}
          >
            <div className="flex flex-col gap-4 p-4 sm:px-6 lg:px-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="w-full justify-start">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="w-full">Sign Up</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button variant="outline" className="w-full justify-start">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">
                      Account
                    </span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    Theme
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
