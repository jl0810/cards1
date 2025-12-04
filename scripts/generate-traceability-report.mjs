#!/usr/bin/env node

/**
 * Traceability Coverage Report Generator
 * 
 * Auto-generates comprehensive coverage statistics for:
 * - User Stories → Code → Tests
 * - Business Rules → Code → Tests
 * - Overall traceability health
 * 
 * Run this manually or in CI to get real-time coverage metrics
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// --- Helper Functions ---

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        return null;
    }
}

function extractIds(content, regex) {
    const matches = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.add(match[1]);
    }
    return Array.from(matches);
}

// --- Main Analysis ---

console.log('📊 Generating Traceability Coverage Report...\n');

// Load Documentation
const userStoriesContent = readFile('docs/USER_STORIES.md') || '';
const businessRulesContent = readFile('docs/BUSINESS_RULES.md') || '';

const definedStories = extractIds(userStoriesContent, /\[(US-\d{3})\]/g);
const definedRules = extractIds(businessRulesContent, /\[(BR-\d{3})\]/g);

console.log(`📚 Documentation:`);
console.log(`   User Stories: ${definedStories.length}`);
console.log(`   Business Rules: ${definedRules.length}\n`);

// Scan Codebase
const codeFiles = glob.sync('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**']
});

const implementedRules = new Set();
const implementedStories = new Set();
const testedRules = new Set();
const testedStories = new Set();
const testedTags = new Map();
let totalTests = 0;
let totalCodeFiles = 0;
let totalTestFiles = 0;

for (const file of codeFiles) {
    const content = readFile(file);
    if (!content) continue;

    const isTestFile = file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.');

    if (isTestFile) {
        totalTestFiles++;

        // Count test cases
        const testCount = (content.match(/test\(|it\(/g) || []).length;
        totalTests += testCount;

        // Track what this test covers
        extractIds(content, /(BR-\d{3})/g).forEach(id => testedRules.add(id));
        extractIds(content, /(US-\d{3})/g).forEach(id => testedStories.add(id));
    } else {
        totalCodeFiles++;

        // Track implementations
        extractIds(content, /@implements\s+(BR-\d{3})/g).forEach(id => implementedRules.add(id));
        extractIds(content, /@satisfies\s+(US-\d{3})/g).forEach(id => implementedStories.add(id));

        // Track @tested tags
        const testedTagPattern = /@tested\s+([^\s]+)/g;
        let match;
        while ((match = testedTagPattern.exec(content)) !== null) {
            testedTags.set(file, match[1]);
        }
    }
}

console.log(`💻 Codebase:`);
console.log(`   Production Files: ${totalCodeFiles}`);
console.log(`   Test Files: ${totalTestFiles}`);
console.log(`   Total Test Cases: ${totalTests}\n`);

// Calculate Coverage
const ruleImplementationCoverage = definedRules.length > 0
    ? ((implementedRules.size / definedRules.length) * 100).toFixed(1)
    : 0;

const ruleTestCoverage = definedRules.length > 0
    ? ((testedRules.size / definedRules.length) * 100).toFixed(1)
    : 0;

const storyImplementationCoverage = definedStories.length > 0
    ? ((implementedStories.size / definedStories.length) * 100).toFixed(1)
    : 0;

const storyTestCoverage = definedStories.length > 0
    ? ((testedStories.size / definedStories.length) * 100).toFixed(1)
    : 0;

// --- Report Output ---

console.log('═'.repeat(60));
console.log('📊 TRACEABILITY COVERAGE REPORT');
console.log('═'.repeat(60));
console.log();

console.log('🔷 BUSINESS RULES COVERAGE');
console.log('─'.repeat(60));
console.log(`   Total Defined: ${definedRules.length}`);
console.log(`   With @implements: ${implementedRules.size} (${ruleImplementationCoverage}%)`);
console.log(`   With Tests: ${testedRules.size} (${ruleTestCoverage}%)`);

const unimplementedRules = definedRules.filter(id => !implementedRules.has(id));
if (unimplementedRules.length > 0) {
    console.log(`   ❌ Missing @implements: ${unimplementedRules.slice(0, 5).join(', ')}${unimplementedRules.length > 5 ? '...' : ''}`);
}

const untestedRules = definedRules.filter(id => !testedRules.has(id));
if (untestedRules.length > 0) {
    console.log(`   ⚠️  No test coverage: ${untestedRules.slice(0, 5).join(', ')}${untestedRules.length > 5 ? '...' : ''}`);
}

console.log();

console.log('🔶 USER STORIES COVERAGE');
console.log('─'.repeat(60));
console.log(`   Total Defined: ${definedStories.length}`);
console.log(`   With @satisfies: ${implementedStories.size} (${storyImplementationCoverage}%)`);
console.log(`   With Tests: ${testedStories.size} (${storyTestCoverage}%)`);

const unimplementedStories = definedStories.filter(id => !implementedStories.has(id));
if (unimplementedStories.length > 0 && unimplementedStories.length < 10) {
    console.log(`   ⚠️  Missing @satisfies: ${unimplementedStories.join(', ')}`);
}

const untestedStories = definedStories.filter(id => !testedStories.has(id));
if (untestedStories.length > 0 && untestedStories.length < 10) {
    console.log(`   ⚠️  No test coverage: ${untestedStories.join(', ')}`);
}

console.log();

console.log('📈 OVERALL METRICS');
console.log('─'.repeat(60));
console.log(`   Total Mappings: ${definedRules.length + definedStories.length}`);
console.log(`   Code References: ${implementedRules.size + implementedStories.size}`);
console.log(`   Test References: ${testedRules.size + testedStories.size}`);
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Files with @tested: ${testedTags.size}`);

console.log();

console.log('🎯 QUALITY SCORE');
console.log('─'.repeat(60));

const avgImplementation = (parseFloat(ruleImplementationCoverage) + parseFloat(storyImplementationCoverage)) / 2;
const avgTest = (parseFloat(ruleTestCoverage) + parseFloat(storyTestCoverage)) / 2;
const overallScore = (avgImplementation + avgTest) / 2;

let grade = 'F';
let emoji = '❌';
if (overallScore >= 95) { grade = 'A+'; emoji = '🏆'; }
else if (overallScore >= 90) { grade = 'A'; emoji = '⭐'; }
else if (overallScore >= 85) { grade = 'B+'; emoji = '✅'; }
else if (overallScore >= 80) { grade = 'B'; emoji = '👍'; }
else if (overallScore >= 75) { grade = 'C+'; emoji = '⚠️'; }
else if (overallScore >= 70) { grade = 'C'; emoji = '⚠️'; }

console.log(`   Implementation Coverage: ${avgImplementation.toFixed(1)}%`);
console.log(`   Test Coverage: ${avgTest.toFixed(1)}%`);
console.log(`   Overall Score: ${overallScore.toFixed(1)}% ${emoji} (Grade: ${grade})`);

console.log();
console.log('═'.repeat(60));

// Exit with error if coverage is too low (optional - can be used in CI)
if (overallScore < 70) {
    console.log('\n⚠️  WARNING: Coverage below 70% threshold!');
    // process.exit(1); // Uncomment to make this fail CI
}

// Optional: Write to JSON for programmatic use
const report = {
    timestamp: new Date().toISOString(),
    documentation: {
        userStories: definedStories.length,
        businessRules: definedRules.length,
    },
    codebase: {
        productionFiles: totalCodeFiles,
        testFiles: totalTestFiles,
        totalTests: totalTests,
    },
    coverage: {
        businessRules: {
            total: definedRules.length,
            implemented: implementedRules.size,
            tested: testedRules.size,
            implementationPercent: parseFloat(ruleImplementationCoverage),
            testPercent: parseFloat(ruleTestCoverage),
        },
        userStories: {
            total: definedStories.length,
            implemented: implementedStories.size,
            tested: testedStories.size,
            implementationPercent: parseFloat(storyImplementationCoverage),
            testPercent: parseFloat(storyTestCoverage),
        },
        overall: {
            score: parseFloat(overallScore.toFixed(1)),
            grade: grade,
        },
    },
    gaps: {
        unimplementedRules: unimplementedRules,
        untestedRules: untestedRules,
        unimplementedStories: unimplementedStories,
        untestedStories: untestedStories,
    },
};

fs.writeFileSync('traceability-report.json', JSON.stringify(report, null, 2));
console.log('📄 Detailed report saved to: traceability-report.json');
