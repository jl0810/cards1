/**
 * Tests for Animated Hero Component
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  AnimatedHero,
  AnimatedButtons,
} from "@/components/marketing/animated-hero";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    h1: ({ children, className, ...props }: any) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("Animated Hero", () => {
  it("should render hero content", () => {
    render(
      <AnimatedHero>
        <h1>Master Your Credit Card Strategy</h1>
        <p>Get Started</p>
      </AnimatedHero>,
    );

    expect(screen.getByText(/Master Your/i)).toBeInTheDocument();
    expect(screen.getByText(/Credit Card Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
  });

  it("should render children correctly", () => {
    render(
      <AnimatedHero>
        <div data-testid="child">Child Content</div>
      </AnimatedHero>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

describe("Animated Buttons", () => {
  it("should render buttons with correct links", () => {
    render(<AnimatedButtons />);

    const startLink = screen.getByText(/Start Tracking/i).closest("a");
    expect(startLink).toHaveAttribute("href", "/sign-up");

    const demoLink = screen.getByText(/View Demo/i).closest("a");
    expect(demoLink).toHaveAttribute("href", "/dashboard");
  });
});
