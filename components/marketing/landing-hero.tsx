import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Star, Users, Zap, Shield, BarChart } from "lucide-react";

export function LandingHero() {
  return (
    <div className="min-h-screen animate-gradient-bg text-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold text-white">YourSaaS</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <SignedIn>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-white hover:bg-white/10">Dashboard</Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="text-white border-white hover:bg-white/10">Pricing</Button>
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/pricing">
                  <Button variant="ghost" className="text-white hover:bg-white/10">Pricing</Button>
                </Link>
                <SignInButton mode="modal">
                  <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <Badge className="mb-4 text-black bg-white/90" variant="secondary">
            <Star className="w-4 h-4 mr-1" />
            Trusted by 1000+ companies
          </Badge>
          
          <h1 className="text-5xl font-bold text-white mb-6">
            Build Your SaaS
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200">
              {" "}10x Faster
            </span>
          </h1>
          
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            The complete SaaS starter template with authentication, billing, analytics, 
            and beautiful UI components. Ship your product in days, not months.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200">
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200">
                  Get Started Free
                </Button>
              </SignInButton>
            </SignedOut>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Enterprise Authentication</CardTitle>
              <CardDescription>
                Built-in user management with Clerk. No database required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Social logins (Google, GitHub, etc.)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Multi-factor authentication
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Role-based access control
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Track user behavior with PostHog analytics out of the box.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Page view tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Custom event analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  User journey insights
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Professional UI</CardTitle>
              <CardDescription>
                Beautiful, accessible components with shadcn/ui and Tailwind.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  50+ pre-built components
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Fully responsive design
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  WCAG accessible by default
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="text-center py-12 border-t border-slate-200">
          <div className="flex items-center justify-center space-x-8 mb-8">
            <div className="flex items-center space-x-1">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-2xl font-bold text-slate-900">10K+</span>
              <span className="text-slate-600">Developers</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-slate-900">4.9</span>
              <span className="text-slate-600">Rating</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-5 h-5 text-slate-400" />
              <span className="text-2xl font-bold text-slate-900">24/7</span>
              <span className="text-slate-600">Support</span>
            </div>
          </div>
          
          <p className="text-slate-600 mb-4">
            Join thousands of developers building amazing products
          </p>
          
          <div className="flex items-center justify-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
