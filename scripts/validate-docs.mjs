#!/usr/bin/env node

/**
 * Advanced Documentation & Traceability Validator
 * 
 * Checks:
 * 1. UI/API changes trigger doc updates
 * 2. No outdated references
 * 3. Deep Traceability:
 *    - Stories (US-XXX) must exist in USER_STORIES.md
 *    - Rules (BR-XXX) must exist in BUSINESS_RULES.md
 *    - Code must reference Rules (@implements BR-XXX)
 *    - Tests must reference Rules/Stories
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const errors = [];
const warnings = [];

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

// --- 1. Basic Git Checks ---

console.log('🔍 Running Documentation Validation...');

const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

// Check UI changes
const uiComponentsChanged = stagedFiles.some(f =>
    f.includes('components/velocity/') ||
    f.includes('components/shared/plaid-link') ||
    f.includes('app/dashboard/page.tsx')
);
if (uiComponentsChanged && !stagedFiles.includes('docs/UI_MAPPING.md')) {
    warnings.push('UI components changed but docs/UI_MAPPING.md not updated');
}

// Check API changes
const apiRoutesChanged = stagedFiles.filter(f => f.includes('app/api/'));
if (apiRoutesChanged.length > 0) {
    const docsUpdated = stagedFiles.some(f => f.includes('docs/') || f.includes('README.md'));
    if (!docsUpdated) {
        warnings.push(`API routes changed (${apiRoutesChanged.length} files) but no docs updated`);
    }
}

// Check outdated references
const docFiles = stagedFiles.filter(f => f.endsWith('.md'));
for (const file of docFiles) {
    const content = readFile(file);
    if (content && content.includes('Settings > Connected Banks') && !file.includes('archive/')) {
        errors.push(`${file} contains outdated reference to "Settings > Connected Banks"`);
    }
}

// --- 2. Deep Traceability Checks ---

console.log('🔗 Verifying Traceability Matrix...');

// Load Definitions
const userStoriesContent = readFile('docs/USER_STORIES.md') || '';
const businessRulesContent = readFile('docs/BUSINESS_RULES.md') || '';

const definedStories = extractIds(userStoriesContent, /\[(US-\d{3})\]/g);
const definedRules = extractIds(businessRulesContent, /\[(BR-\d{3})\]/g);

console.log(`   Found ${definedStories.length} Stories and ${definedRules.length} Rules defined.`);

// Scan Codebase for Implementations
const codeFiles = glob.sync('**/*.{ts,tsx}', { ignore: ['node_modules/**', '.next/**', 'dist/**'] });
const implementedRules = new Set();
const implementedStories = new Set();
const testedRules = new Set();
const testedStories = new Set();
const testedTagFiles = new Map(); // Track @tested tags
let totalTests = 0;

for (const file of codeFiles) {
    const content = readFile(file);
    if (!content) continue;

    // Check for @implements BR-XXX
    const implementsMatches = extractIds(content, /@implements\s+(BR-\d{3})/g);
    implementsMatches.forEach(id => implementedRules.add(id));

    // Check for @satisfies US-XXX
    const satisfiesMatches = extractIds(content, /@satisfies\s+(US-\d{3})/g);
    satisfiesMatches.forEach(id => implementedStories.add(id));

    // Check for @tested tags and validate they point to real files
    const testedTagPattern = /@tested\s+([^\s]+)/g;
    let testedMatch;
    while ((testedMatch = testedTagPattern.exec(content)) !== null) {
        const testFile = testedMatch[1];

        // Allow "None", "Manual", or other documentation values
        const isDocValue = ['None', 'Manual', 'Integration', 'E2E', 'Planned'].some(
            val => testFile.toLowerCase().includes(val.toLowerCase())
        );

        // Only validate actual file paths (starting with __ or containing .test)
        const looksLikeFilePath = testFile.startsWith('__') || testFile.includes('.test');

        if (looksLikeFilePath && !fs.existsSync(testFile)) {
            errors.push(`${file} claims @tested ${testFile} but file doesn't exist!`);
        } else if (looksLikeFilePath) {
            // Check for placeholder content
            const testContent = readFile(testFile);
            if (testContent && (
                testContent.includes('placeholder test') ||
                testContent.includes('expect(true).toBe(true)') ||
                testContent.length < 100 // Very short files are suspicious
            )) {
                errors.push(`${file} claims @tested ${testFile} but it appears to be a placeholder!`);
            } else {
                testedTagFiles.set(file, testFile);
            }
        } else if (!isDocValue) {
            testedTagFiles.set(file, testFile);
        }
    }

    // Check for tests referencing BR-XXX and US-XXX
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
        const testMatches = extractIds(content, /(BR-\d{3})/g);
        testMatches.forEach(id => testedRules.add(id));

        const storyTestMatches = extractIds(content, /(US-\d{3})/g);
        storyTestMatches.forEach(id => testedStories.add(id));

        // Count tests
        const testCount = (content.match(/test\(|it\(/g) || []).length;
        totalTests += testCount;
    }
}

console.log(`   Scanned ${codeFiles.length} code files, found ${totalTests} tests`);
console.log(`   Implementation tracking: ${implementedRules.size} rules, ${implementedStories.size} stories`);
console.log(`   Test coverage: ${testedRules.size} rules, ${testedStories.size} stories`);

// --- STRICT VALIDATION (ENABLED) ---

// ✅ 1. Validate Business Rules have Implementation
const unimplementedRules = definedRules.filter(id => !implementedRules.has(id));
if (unimplementedRules.length > 0) {
    errors.push(
        `Business Rules defined but not implemented in code:\n` +
        `   ${unimplementedRules.join(', ')}\n` +
        `   → Add @implements BR-XXX tags to code or remove unused rules from BUSINESS_RULES.md`
    );
}

// ✅ 2. Validate Business Rules have Tests (WARNING, not blocking)
const untestedRules = definedRules.filter(id => !testedRules.has(id));
if (untestedRules.length > 0) {
    warnings.push(
        `Business Rules not referenced in tests (${untestedRules.length}):\n` +
        `   ${untestedRules.slice(0, 10).join(', ')}${untestedRules.length > 10 ? '...' : ''}\n` +
        `   → Add test coverage or document as tested manually`
    );
}

// ✅ 3. Validate User Stories have Implementation (WARNING)
const unimplementedStories = definedStories.filter(id => !implementedStories.has(id));
if (unimplementedStories.length > 0 && unimplementedStories.length < definedStories.length * 0.5) {
    // Only warn if less than half are unimplemented (avoid noise during initial setup)
    warnings.push(
        `User Stories not explicitly implemented (${unimplementedStories.length}):\n` +
        `   ${unimplementedStories.slice(0, 5).join(', ')}${unimplementedStories.length > 5 ? '...' : ''}\n` +
        `   → Add @satisfies US-XXX tags to code`
    );
}

// ✅ 4. Validate User Stories have Tests (WARNING)
const untestedStories = definedStories.filter(id => !testedStories.has(id));
if (untestedStories.length > 0 && untestedStories.length < definedStories.length * 0.5) {
    warnings.push(
        `User Stories without test references (${untestedStories.length}):\n` +
        `   ${untestedStories.slice(0, 5).join(', ')}${untestedStories.length > 5 ? '...' : ''}\n` +
        `   → Add US-XXX references to test files`
    );
}

// ✅ 5. Check for Undefined References in Code (ERROR)
const allReferencedRules = [...implementedRules, ...testedRules];
const undefinedRules = allReferencedRules.filter(id => !definedRules.includes(id));

if (undefinedRules.length > 0) {
    errors.push(
        `Code references undefined Business Rules:\n` +
        `   ${undefinedRules.join(', ')}\n` +
        `   → Add them to BUSINESS_RULES.md or fix typos`
    );
}

// ✅ 6. Check for Undefined User Story References (WARNING)
const allReferencedStories = [...implementedStories, ...testedStories];
const undefinedStories = allReferencedStories.filter(id => !definedStories.includes(id));

if (undefinedStories.length > 0) {
    warnings.push(
        `Code references undefined User Stories:\n` +
        `   ${undefinedStories.join(', ')}\n` +
        `   → Add them to USER_STORIES.md or fix typos`
    );
}

// --- 3. Output Results ---

if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
}

if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (non-blocking):');
    warnings.forEach(warn => console.log(`  - ${warn}`));
}

console.log('\n✅ Documentation & Traceability Checks Passed');
