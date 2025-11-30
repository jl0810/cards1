#!/usr/bin/env tsx

/**
 * Documentation Audit Script
 * 
 * Verifies documentation compliance across the codebase
 * 
 * @implements BR-048 - Documentation Standards
 * @satisfies US-040 - Documentation Compliance
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface DocumentationIssue {
  file: string;
  type: 'missing-jsdoc' | 'missing-traceability' | 'missing-module' | 'missing-tests';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface DocumentationStats {
  totalFiles: number;
  filesWithJSDoc: number;
  filesWithTraceability: number;
  filesWithTests: number;
  issues: DocumentationIssue[];
}

class DocumentationAuditor {
  private stats: DocumentationStats = {
    totalFiles: 0,
    filesWithJSDoc: 0,
    filesWithTraceability: 0,
    filesWithTests: 0,
    issues: []
  };

  async auditDirectory(dir: string): Promise<DocumentationStats> {
    this.stats = {
      totalFiles: 0,
      filesWithJSDoc: 0,
      filesWithTraceability: 0,
      filesWithTests: 0,
      issues: []
    };
    
    await this.scanDirectory(dir);
    return this.stats;
  }

  private async scanDirectory(dir: string): Promise<void> {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await this.scanDirectory(fullPath);
      } else if (stat.isFile() && this.shouldAuditFile(item)) {
        await this.auditFile(fullPath);
      }
    }
  }

  private shouldAuditFile(filename: string): boolean {
    const ext = extname(filename);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  private async auditFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      this.stats.totalFiles++;
      
      this.checkJSDocCompliance(filePath, content);
      this.checkTraceabilityCompliance(filePath, content);
      this.checkTestReferences(filePath, content);
    } catch (error) {
      console.error(`Error auditing ${filePath}:`, error);
    }
  }

  private checkJSDocCompliance(file: string, content: string): void {
    const hasJSDoc = content.includes('/**') && content.includes('*/');
    const hasModule = content.includes('@module');
    const isComponent = file.includes('components/') || file.includes('pages/');
    const isLibrary = file.includes('lib/') || file.includes('hooks/');
    
    if ((isComponent || isLibrary) && !hasJSDoc) {
      this.stats.issues.push({
        file,
        type: 'missing-jsdoc',
        severity: 'medium',
        description: 'Missing JSDoc documentation'
      });
    } else if (hasJSDoc && !hasModule) {
      this.stats.issues.push({
        file,
        type: 'missing-module',
        severity: 'low',
        description: 'Missing @module tag in JSDoc'
      });
    } else if (hasJSDoc && hasModule) {
      this.stats.filesWithJSDoc++;
    }
  }

  private checkTraceabilityCompliance(file: string, content: string): void {
    const hasTraceability = content.includes('@implements') || content.includes('@satisfies');
    
    if (content.includes('@module') && !hasTraceability) {
      this.stats.issues.push({
        file,
        type: 'missing-traceability',
        severity: 'medium',
        description: 'Missing business rule traceability (@implements/@satisfies)'
      });
    } else if (hasTraceability) {
      this.stats.filesWithTraceability++;
    }
  }

  private checkTestReferences(file: string, content: string): void {
    const hasTestReference = content.includes('@tested');
    const hasJSDoc = content.includes('/**') && content.includes('*/');
    
    if (hasJSDoc && !hasTestReference) {
      this.stats.issues.push({
        file,
        type: 'missing-tests',
        severity: 'low',
        description: 'Missing test reference (@tested) in JSDoc'
      });
    } else if (hasTestReference) {
      this.stats.filesWithTests++;
    }
  }

  generateReport(): string {
    const complianceRate = {
      jsdoc: Math.round((this.stats.filesWithJSDoc / this.stats.totalFiles) * 100),
      traceability: Math.round((this.stats.filesWithTraceability / this.stats.totalFiles) * 100),
      tests: Math.round((this.stats.filesWithTests / this.stats.totalFiles) * 100)
    };

    const report = [
      '# Documentation Audit Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary Statistics',
      `Total Files Audited: ${this.stats.totalFiles}`,
      `Files with JSDoc: ${this.stats.filesWithJSDoc} (${complianceRate.jsdoc}%)`,
      `Files with Traceability: ${this.stats.filesWithTraceability} (${complianceRate.traceability}%)`,
      `Files with Test References: ${this.stats.filesWithTests} (${complianceRate.tests}%)`,
      `Total Issues: ${this.stats.issues.length}`,
      '',
      '## Compliance Rates',
      `- JSDoc Documentation: ${this.getComplianceEmoji(complianceRate.jsdoc)} ${complianceRate.jsdoc}%`,
      `- Business Rule Traceability: ${this.getComplianceEmoji(complianceRate.traceability)} ${complianceRate.traceability}%`,
      `- Test References: ${this.getComplianceEmoji(complianceRate.tests)} ${complianceRate.tests}%`,
      '',
      '## Issues Found',
      ...this.stats.issues.map(issue => [
        `### ${issue.type.toUpperCase()} - ${issue.severity.toUpperCase()}`,
        `**File:** ${issue.file}`,
        `**Description:** ${issue.description}`,
        ''
      ]).flat(),
      '',
      '## Documentation Standards Compliance',
      this.getOverallCompliance(complianceRate),
      '',
      '## Recommendations',
      this.getRecommendations(complianceRate)
    ].filter(Boolean).join('\n');

    return report;
  }

  private getComplianceEmoji(percentage: number): string {
    if (percentage >= 90) return '✅';
    if (percentage >= 70) return '⚠️';
    return '❌';
  }

  private getOverallCompliance(rates: { jsdoc: number; traceability: number; tests: number }): string {
    const average = Math.round((rates.jsdoc + rates.traceability + rates.tests) / 3);
    
    if (average >= 90) {
      return '🎉 **EXCELLENT** - Documentation standards fully compliant';
    } else if (average >= 70) {
      return '⚠️ **GOOD** - Documentation mostly compliant with some gaps';
    } else {
      return '❌ **NEEDS IMPROVEMENT** - Documentation standards not met';
    }
  }

  private getRecommendations(rates: { jsdoc: number; traceability: number; tests: number }): string[] {
    const recommendations: string[] = [];
    
    if (rates.jsdoc < 90) {
      recommendations.push('1. Add JSDoc comments to all components and library files');
    }
    
    if (rates.traceability < 90) {
      recommendations.push('2. Include @implements and @satisfies tags for business rule traceability');
    }
    
    if (rates.tests < 90) {
      recommendations.push('3. Add @tested references to all documented functions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🎉 Documentation standards are excellent! Keep up the good work.');
    }
    
    return recommendations;
  }
}

// Run the audit
async function main() {
  console.log('📚 Running Documentation Audit...\n');
  
  const auditor = new DocumentationAuditor();
  const stats = await auditor.auditDirectory('./lib');
  
  console.log(auditor.generateReport());
  
  // Also audit components
  const componentStats = await auditor.auditDirectory('./components');
  console.log('\n# Components Documentation\n');
  console.log(`Components with JSDoc: ${componentStats.filesWithJSDoc}/${componentStats.totalFiles}`);
  console.log(`Components with Traceability: ${componentStats.filesWithTraceability}/${componentStats.totalFiles}`);
  
  const overallCompliance = Math.round(
    ((stats.filesWithJSDoc + componentStats.filesWithJSDoc) / 
     (stats.totalFiles + componentStats.totalFiles)) * 100
  );
  
  console.log(`\nOverall Documentation Compliance: ${overallCompliance}%`);
  
  if (overallCompliance < 80) {
    process.exit(1); // Exit with error code if compliance is low
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DocumentationAuditor };
