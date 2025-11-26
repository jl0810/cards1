import { describe, expect, it } from '@jest/globals';
import { BENEFIT_MATCHING_RULES, type BenefitMatchCriteria } from '@/lib/benefit-matcher';

describe('Benefit Matcher', () => {
  describe('BENEFIT_MATCHING_RULES', () => {
    it('should have Uber benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.uber).toBeDefined();
      expect(BENEFIT_MATCHING_RULES.uber).toHaveLength(1);
      
      const uberRule = BENEFIT_MATCHING_RULES.uber[0];
      expect(uberRule.benefitId).toBe('uber_cash');
      expect(uberRule.benefitName).toBe('Uber Cash Credit');
      expect(uberRule.monthlyLimit).toBe(15);
      expect(uberRule.annualLimit).toBe(200);
    });

    it('should have Saks benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.saks).toBeDefined();
      const saksRule = BENEFIT_MATCHING_RULES.saks[0];
      expect(saksRule.benefitId).toBe('saks_credit');
      expect(saksRule.monthlyLimit).toBe(50);
      expect(saksRule.annualLimit).toBe(100);
    });

    it('should have airline benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.airline).toBeDefined();
      const airlineRule = BENEFIT_MATCHING_RULES.airline[0];
      expect(airlineRule.benefitId).toBe('airline_credit');
      expect(airlineRule.maxAmount).toBe(200);
      expect(airlineRule.annualLimit).toBe(200);
      expect(airlineRule.categories).toContain('Travel');
      expect(airlineRule.categories).toContain('Airlines');
    });

    it('should have digital entertainment benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.digital_entertainment).toBeDefined();
      const entertainmentRule = BENEFIT_MATCHING_RULES.digital_entertainment[0];
      expect(entertainmentRule.benefitId).toBe('digital_entertainment');
      expect(entertainmentRule.monthlyLimit).toBe(20);
      expect(entertainmentRule.annualLimit).toBe(240);
    });

    it('should have Walmart+ benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.walmart).toBeDefined();
      const walmartRule = BENEFIT_MATCHING_RULES.walmart[0];
      expect(walmartRule.benefitId).toBe('walmart_plus');
      expect(walmartRule.monthlyLimit).toBe(12.95);
      expect(walmartRule.minAmount).toBe(12.00);
      expect(walmartRule.maxAmount).toBe(16.00);
    });

    it('should have hotel benefit rules', () => {
      expect(BENEFIT_MATCHING_RULES.hotel).toBeDefined();
      const hotelRule = BENEFIT_MATCHING_RULES.hotel[0];
      expect(hotelRule.benefitId).toBe('hotel_credit');
      expect(hotelRule.annualLimit).toBe(200);
    });
  });

  describe('Merchant Pattern Matching', () => {
    it('should have multiple Uber patterns', () => {
      const uberPatterns = BENEFIT_MATCHING_RULES.uber[0].merchantPatterns;
      expect(uberPatterns).toContain('uber');
      expect(uberPatterns).toContain('uber eats');
      expect(uberPatterns).toContain('ubereats');
    });

    it('should have regex-friendly Saks patterns', () => {
      const saksPatterns = BENEFIT_MATCHING_RULES.saks[0].merchantPatterns;
      expect(saksPatterns).toContain('saks\\.com');
      expect(saksPatterns).toContain('saksfifthavenue');
    });

    it('should have all major airline patterns', () => {
      const airlinePatterns = BENEFIT_MATCHING_RULES.airline[0].merchantPatterns;
      expect(airlinePatterns).toContain('american airlines');
      expect(airlinePatterns).toContain('delta air lines');
      expect(airlinePatterns).toContain('united airlines');
      expect(airlinePatterns).toContain('southwest airlines');
      expect(airlinePatterns).toContain('jetblue');
      expect(airlinePatterns).toContain('alaska airlines');
    });

    it('should have streaming service patterns with regex escapes', () => {
      const entertainmentPatterns = BENEFIT_MATCHING_RULES.digital_entertainment[0].merchantPatterns;
      expect(entertainmentPatterns).toContain('disney\\+');
      expect(entertainmentPatterns).toContain('espn\\+');
      expect(entertainmentPatterns).toContain('disney plus');
    });

    it('should have New York Times patterns', () => {
      const entertainmentPatterns = BENEFIT_MATCHING_RULES.digital_entertainment[0].merchantPatterns;
      expect(entertainmentPatterns).toContain('nyt');
      expect(entertainmentPatterns).toContain('new york times');
    });
  });

  describe('Benefit Limits', () => {
    it('should have correct monthly and annual limits', () => {
      // Uber: $15/month, $200/year
      expect(BENEFIT_MATCHING_RULES.uber[0].monthlyLimit).toBe(15);
      expect(BENEFIT_MATCHING_RULES.uber[0].annualLimit).toBe(200);

      // Digital Entertainment: $20/month, $240/year
      expect(BENEFIT_MATCHING_RULES.digital_entertainment[0].monthlyLimit).toBe(20);
      expect(BENEFIT_MATCHING_RULES.digital_entertainment[0].annualLimit).toBe(240);

      // Walmart+: $12.95/month, $155.40/year
      expect(BENEFIT_MATCHING_RULES.walmart[0].monthlyLimit).toBe(12.95);
      expect(BENEFIT_MATCHING_RULES.walmart[0].annualLimit).toBe(155.40);
    });

    it('should have amount guardrails for Walmart+', () => {
      const walmartRule = BENEFIT_MATCHING_RULES.walmart[0];
      expect(walmartRule.minAmount).toBe(12.00);
      expect(walmartRule.maxAmount).toBe(16.00);
    });

    it('should have no min/max for most benefits', () => {
      expect(BENEFIT_MATCHING_RULES.uber[0].minAmount).toBeUndefined();
      expect(BENEFIT_MATCHING_RULES.uber[0].maxAmount).toBeUndefined();
      
      expect(BENEFIT_MATCHING_RULES.saks[0].minAmount).toBeUndefined();
      expect(BENEFIT_MATCHING_RULES.saks[0].maxAmount).toBeUndefined();
    });

    it('should have max amount for airline benefit', () => {
      expect(BENEFIT_MATCHING_RULES.airline[0].maxAmount).toBe(200);
    });
  });

  describe('Benefit Categories', () => {
    it('should have categories for airline benefit', () => {
      const categories = BENEFIT_MATCHING_RULES.airline[0].categories;
      expect(categories).toBeDefined();
      expect(categories).toHaveLength(2);
    });

    it('should not have categories for most benefits', () => {
      expect(BENEFIT_MATCHING_RULES.uber[0].categories).toBeUndefined();
      expect(BENEFIT_MATCHING_RULES.saks[0].categories).toBeUndefined();
      expect(BENEFIT_MATCHING_RULES.walmart[0].categories).toBeUndefined();
    });
  });

  describe('BenefitMatchCriteria Interface', () => {
    it('should match expected structure', () => {
      const uberCriteria: BenefitMatchCriteria = {
        benefitId: 'test_benefit',
        benefitName: 'Test Benefit',
        merchantPatterns: ['test'],
        categories: ['category1'],
        minAmount: 10,
        maxAmount: 100,
        monthlyLimit: 50,
        annualLimit: 600,
      };

      expect(uberCriteria.benefitId).toBe('test_benefit');
      expect(uberCriteria.merchantPatterns).toHaveLength(1);
    });

    it('should allow optional fields', () => {
      const minimalCriteria: BenefitMatchCriteria = {
        benefitId: 'minimal',
        benefitName: 'Minimal Benefit',
        merchantPatterns: ['pattern'],
      };

      expect(minimalCriteria.categories).toBeUndefined();
      expect(minimalCriteria.minAmount).toBeUndefined();
      expect(minimalCriteria.maxAmount).toBeUndefined();
      expect(minimalCriteria.monthlyLimit).toBeUndefined();
      expect(minimalCriteria.annualLimit).toBeUndefined();
    });
  });

  describe('Benefit Rule Completeness', () => {
    it('should have all required properties for each rule', () => {
      Object.entries(BENEFIT_MATCHING_RULES).forEach(([key, rules]) => {
        rules.forEach(rule => {
          expect(rule.benefitId).toBeDefined();
          expect(rule.benefitName).toBeDefined();
          expect(rule.merchantPatterns).toBeDefined();
          expect(rule.merchantPatterns.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have unique benefit IDs', () => {
      const allBenefitIds: string[] = [];
      Object.values(BENEFIT_MATCHING_RULES).forEach(rules => {
        rules.forEach(rule => {
          allBenefitIds.push(rule.benefitId);
        });
      });

      const uniqueIds = new Set(allBenefitIds);
      expect(uniqueIds.size).toBe(allBenefitIds.length);
    });

    it('should have at least 6 benefit types', () => {
      const benefitTypes = Object.keys(BENEFIT_MATCHING_RULES);
      expect(benefitTypes.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Regex Pattern Validation', () => {
    it('should have valid regex patterns', () => {
      Object.values(BENEFIT_MATCHING_RULES).forEach(rules => {
        rules.forEach(rule => {
          rule.merchantPatterns.forEach(pattern => {
            // Ensure pattern can be converted to valid regex
            expect(() => new RegExp(pattern, 'i')).not.toThrow();
          });
        });
      });
    });

    it('should have case-insensitive matching potential', () => {
      // All patterns should work case-insensitively
      const testPattern = BENEFIT_MATCHING_RULES.uber[0].merchantPatterns[0];
      const regex = new RegExp(testPattern, 'i');
      
      expect(regex.test('UBER')).toBe(true);
      expect(regex.test('Uber')).toBe(true);
      expect(regex.test('uber')).toBe(true);
    });
  });

  describe('Limit Calculations', () => {
    it('should have monthly limits that multiply to close to annual limits', () => {
      // Uber: $15 * 12 = $180 (but annual is $200 due to Dec bonus)
      const uberRule = BENEFIT_MATCHING_RULES.uber[0];
      // Allow for December bonus in annual limit
      expect(uberRule.annualLimit! - uberRule.monthlyLimit! * 12).toBeLessThanOrEqual(30);

      // Digital Entertainment: $20 * 12 = $240
      const entertainmentRule = BENEFIT_MATCHING_RULES.digital_entertainment[0];
      expect(entertainmentRule.monthlyLimit! * 12).toBe(entertainmentRule.annualLimit);

      // Walmart+: $12.95 * 12 = $155.40
      const walmartRule = BENEFIT_MATCHING_RULES.walmart[0];
      expect(walmartRule.monthlyLimit! * 12).toBeCloseTo(walmartRule.annualLimit!, 2);
    });

    it('should have semi-annual limit for Saks', () => {
      // Saks is $50 every 6 months = $100/year
      const saksRule = BENEFIT_MATCHING_RULES.saks[0];
      expect(saksRule.monthlyLimit! * 2).toBe(saksRule.annualLimit);
    });
  });
});
