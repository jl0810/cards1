/**
 * Security testing utilities
 *
 * @module lib/security-test
 * @implements BR-045 - Security Testing
 * @satisfies US-037 - Vulnerability Scanning
 */

/**
 * Test for common XSS attack vectors
 */
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  'javascript:alert("xss")',
  '<svg onload=alert("xss")>',
  '"><script>alert("xss")</script>',
  "'><script>alert('xss')</script>",
  "<iframe src=\"javascript:alert('xss')\"></iframe>",
  '<body onload=alert("xss")>',
  '<input onfocus=alert("xss") autofocus>',
  '<select onfocus=alert("xss") autofocus>',
  '<textarea onfocus=alert("xss") autofocus>',
  '<keygen onfocus=alert("xss") autofocus>',
  "<video><source onerror=\"alert('xss')\">",
  '<audio src=x onerror=alert("xss")">',
  '<details open ontoggle=alert("xss")>',
  '<marquee onstart=alert("xss")>',
  '<isindex action=javascript:alert("xss") type=submit>',
  '<form><button formaction=javascript:alert("xss")>',
];

/**
 * Test for SQL injection patterns
 */
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1--",
  "'; DROP TABLE users;--",
  "' UNION SELECT * FROM users--",
  "1' OR '1'='1' --",
  "admin'--",
  "admin' /*",
  "' OR 1=1#",
  "' OR 1=1/*",
  "') OR '1'='1--",
  "') OR ('1'='1--",
];

/**
 * Test for path traversal attacks
 */
export const PATH_TRAVERSAL_PAYLOADS = [
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",
  "....//....//....//etc/passwd",
  "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "..%252f..%252f..%252fetc%252fpasswd",
  "....\\\\....\\\\....\\\\windows\\\\system32\\\\drivers\\\\etc\\\\hosts",
];

/**
 * Security test runner
 */
export class SecurityTester {
  /**
   * Test input sanitization against XSS payloads
   */
  static testXssSanitization(sanitizer: (input: string) => string): {
    passed: boolean;
    failed: string[];
  } {
    const failed: string[] = [];

    for (const payload of XSS_PAYLOADS) {
      const _testUrl = "https://example.com/api/test";
      const result = sanitizer(payload);
      if (
        result.includes("<script") ||
        result.includes("javascript:") ||
        result.includes("onerror=") ||
        result.includes("onload=")
      ) {
        failed.push(payload);
      }
    }

    return {
      passed: failed.length === 0,
      failed,
    };
  }

  /**
   * Test parameter validation against SQL injection
   */
  static testSqlInjectionValidation(validator: (input: string) => boolean): {
    passed: boolean;
    failed: string[];
  } {
    const failed: string[] = [];

    for (const payload of SQL_INJECTION_PAYLOADS) {
      if (validator(payload)) {
        failed.push(payload);
      }
    }

    return {
      passed: failed.length === 0,
      failed,
    };
  }

  /**
   * Test file path validation against path traversal
   */
  static testPathTraversalValidation(validator: (input: string) => boolean): {
    passed: boolean;
    failed: string[];
  } {
    const failed: string[] = [];

    for (const payload of PATH_TRAVERSAL_PAYLOADS) {
      if (validator(payload)) {
        failed.push(payload);
      }
    }

    return {
      passed: failed.length === 0,
      failed,
    };
  }

  /**
   * Generate security test report
   */
  static generateReport(results: {
    xss: ReturnType<typeof SecurityTester.testXssSanitization>;
    sql: ReturnType<typeof SecurityTester.testSqlInjectionValidation>;
    pathTraversal: ReturnType<
      typeof SecurityTester.testPathTraversalValidation
    >;
  }): string {
    const report = [
      "# Security Test Report",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## XSS Protection",
      results.xss.passed ? "✅ PASSED" : "❌ FAILED",
      results.xss.failed.length > 0
        ? `Failed payloads: ${results.xss.failed.length}`
        : "",
      "",
      "## SQL Injection Protection",
      results.sql.passed ? "✅ PASSED" : "❌ FAILED",
      results.sql.failed.length > 0
        ? `Failed payloads: ${results.sql.failed.length}`
        : "",
      "",
      "## Path Traversal Protection",
      results.pathTraversal.passed ? "✅ PASSED" : "❌ FAILED",
      results.pathTraversal.failed.length > 0
        ? `Failed payloads: ${results.pathTraversal.failed.length}`
        : "",
      "",
      results.xss.passed && results.sql.passed && results.pathTraversal.passed
        ? "🎉 ALL SECURITY TESTS PASSED"
        : "⚠️ SECURITY ISSUES FOUND",
    ]
      .filter(Boolean)
      .join("\n");

    return report;
  }
}

/**
 * Quick security validation for common patterns
 */
export function quickSecurityCheck(input: string): {
  safe: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for script tags
  if (/<script/i.test(input)) {
    issues.push("Contains script tag");
  }

  // Check for JavaScript URLs
  if (/javascript:/i.test(input)) {
    issues.push("Contains JavaScript URL");
  }

  // Check for event handlers
  if (/on\w+\s*=/i.test(input)) {
    issues.push("Contains event handler");
  }

  // Check for SQL patterns
  if (/union\s+select|drop\s+table|or\s+1\s*=\s*1/i.test(input)) {
    issues.push("Contains SQL injection pattern");
  }

  // Check for path traversal
  if (/\.\.[/\\]/.test(input)) {
    issues.push("Contains path traversal pattern");
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
