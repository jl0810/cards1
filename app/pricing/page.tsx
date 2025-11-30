"use client"; // This page needs state for the toggle


import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { MarketingHeader } from "@/app/_template/components/marketing-header";


// Define our plan data
const plans = [
  {
    name: "Starter",
    description: "For individuals and hobby projects.",
    monthlyPrice: 0,
    annualPrice: 0,
    features: ["1 Project", "1 User", "Basic Analytics"],
    cta: "Get Started",
    variant: "outline",
  },
  {
    name: "Pro",
    description: "For small teams and startups.",
    monthlyPrice: 29,
    annualPrice: 23,
    features: [
      "10 Projects",
      "Up to 5 Users",
      "Advanced Analytics",
      "Email Support",
    ],
    cta: "Start 14-day Trial",
    variant: "default",
    recommended: true,
  },
  {
    name: "Enterprise",
    description: "For large-scale applications.",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      "Unlimited Projects",
      "Unlimited Users",
      "Dedicated Support & SSO",
      "Advanced Security",
    ],
    cta: "Contact Sales",
    variant: "outline",
  },
];


export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);


  return (
    // Wrap everything in a fragment or div
    <>
      <MarketingHeader /> {/* <-- ADD THE HEADER HERE */}
      <div className="flex flex-col items-center py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        {/* 1. Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Choose the plan that&apos;s right for your team. Cancel anytime.
          </p>
        </div>


        {/* 2. Toggle */}
        <div className="mt-16 flex justify-center items-center space-x-4">
          <Label
            htmlFor="price-toggle"
            className={cn(
              "font-medium",
              !isAnnual ? "text-primary" : "text-muted-foreground"
            )}
          >
            Monthly
          </Label>
          <Switch
            id="price-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label="Toggle billing period"
          />
          <Label
            htmlFor="price-toggle"
            className={cn(
              "font-medium",
              isAnnual ? "text-primary" : "text-muted-foreground"
            )}
          >
            Annual
          </Label>
          <Badge
            variant="outline"
            className="text-xs font-semibold text-green-600 border-green-600/50 bg-green-500/10"
          >
            Save 20%
          </Badge>
        </div>


        {/* 3. Pricing Tiers */}
        <div className="mx-auto mt-12 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "flex flex-col",
                plan.recommended
                  ? "border-2 border-primary shadow-primary/20"
                  : "border-border",
                "transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1" // Added hover
              )}
            >
              {plan.recommended && (
                <Badge className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}


              <CardHeader className="pt-8">
                <CardTitle className="text-2xl font-semibold">
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>


              <CardContent className="flex-1">
                {/* Price */}
                <div className="mt-4 flex items-baseline gap-x-2">
                  {plan.monthlyPrice === null ? (
                    <span className="text-5xl font-bold tracking-tight text-foreground">
                      Custom
                    </span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold tracking-tight text-foreground">
                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-base font-semibold text-muted-foreground">
                        / month
                      </span>
                    </>
                  )}
                </div>


                {/* Features */}
                <ul
                  role="list"
                  className="mt-10 space-y-4 text-sm leading-6 text-muted-foreground"
                >
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3 items-center">
                      <Check
                        className="h-5 w-5 flex-none text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>


              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.variant as "default" | "outline"}
                  asChild
                >
                  <a
                    href={
                      plan.cta === "Contact Sales" ? "/contact" : "/sign-up"
                    }
                  >
                    {plan.cta}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </> // <-- Close the wrapper
  );
}
