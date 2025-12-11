/**
 * Tests for Animated Features Component
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AnimatedFeatures } from "@/components/marketing/animated-features";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  useInView: () => true,
}));

describe("Animated Features", () => {
  it("should render all feature sections", () => {
    render(<AnimatedFeatures />);

    expect(screen.getByText(/Points Optimization/i)).toBeInTheDocument();
    expect(screen.getByText(/Bank Integration/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart Alerts/i)).toBeInTheDocument();
  });

  it("should render feature descriptions", () => {
    render(<AnimatedFeatures />);

    expect(
      screen.getByText(/Know exactly which card to use/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Connect securely with Plaid/i),
    ).toBeInTheDocument();
  });
});
