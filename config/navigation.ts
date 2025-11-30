/**
 * Navigation configuration
 * Central place for all navigation menus
 * 
 * @module config/navigation
 */

import {
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Gift,
} from 'lucide-react';

export const navConfig = {
  // Public marketing pages
  mainNav: [
    { title: 'Features', href: '/#features' },
    { title: 'Pricing', href: '/pricing' },
  ],
  
  // Authenticated dashboard navigation
  dashboardNav: [
    { 
      title: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      description: 'Overview of your accounts',
    },
    { 
      title: 'Benefits', 
      href: '/benefits', 
      icon: Gift,
      description: 'Track your card benefits',
    },
    { 
      title: 'Transactions', 
      href: '/transactions', 
      icon: Receipt,
      description: 'View matched transactions',
    },
  ],
  
  // Settings navigation
  settingsNav: [
    { 
      title: 'Profile', 
      href: '/settings', 
      icon: Users,
      description: 'Manage your profile',
    },
    { 
      title: 'Billing', 
      href: '/billing', 
      icon: CreditCard,
      description: 'Subscription & payments',
    },
    { 
      title: 'Preferences', 
      href: '/settings#preferences', 
      icon: Settings,
      description: 'App settings',
    },
  ],
  
  // Admin navigation
  adminNav: [
    { title: 'Overview', href: '/admin' },
    { title: 'Card Catalog', href: '/admin/card-catalog' },
    { title: 'Users', href: '/admin/users' },
  ],
  
  // Footer navigation
  footerNav: {
    product: [
      { title: 'Features', href: '/#features' },
      { title: 'Pricing', href: '/pricing' },
    ],
    company: [
      { title: 'About', href: '/about' },
      { title: 'Contact', href: '/contact' },
    ],
    legal: [
      { title: 'Privacy', href: '/privacy' },
      { title: 'Terms', href: '/terms' },
    ],
    support: [
      { title: 'Help Center', href: '/help' },
      { title: 'Documentation', href: '/docs' },
    ],
  },
} as const;

export type NavConfig = typeof navConfig;
