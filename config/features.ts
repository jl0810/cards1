/**
 * Feature flags configuration
 * Toggle features on/off for different environments
 * 
 * @module config/features
 */

export const featuresConfig = {
  // Core features
  plaidIntegration: true,
  benefitMatching: true,
  transactionSync: true,
  
  // Beta features (controlled by user preference)
  aiImport: true,
  advancedAnalytics: false,
  exportReports: false,
  
  // Admin features
  adminDashboard: true,
  cardCatalogManagement: true,
  userManagement: true,
  
  // Experimental (dev only)
  debugMode: process.env.NODE_ENV === 'development',
  mockPlaid: process.env.ENABLE_MOCK_PLAID === 'true',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featuresConfig): boolean {
  return featuresConfig[feature] ?? false;
}

export type FeaturesConfig = typeof featuresConfig;
