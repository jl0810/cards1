/**
 * Site configuration
 * Central place for site metadata and branding
 * 
 * @module config/site
 */

export const siteConfig = {
  name: 'Cards Gone Crazy',
  description: 'Track your credit card benefits and maximize your rewards',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://cardsgonecrazy.com',
  ogImage: '/og-image.png',
  
  links: {
    twitter: 'https://twitter.com/cardsgonecrazy',
    github: 'https://github.com/cardsgonecrazy',
  },
  
  creator: 'Cards Gone Crazy Team',
  
  keywords: [
    'credit cards',
    'rewards',
    'benefits tracking',
    'statement credits',
    'plaid',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
