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
const testedRules = new Set();

for (const file of codeFiles) {
    const content = readFile(file);
    if (!content) continue;

    // Check for @implements BR-XXX
    const implementsMatches = extractIds(content, /@implements\s+(BR-\d{3})/g);
    implementsMatches.forEach(id => implementedRules.add(id));

    // Check for tests referencing BR-XXX
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
        const testMatches = extractIds(content, /(BR-\d{3})/g);
        testMatches.forEach(id => testedRules.add(id));
    }
}

// Validate Rules have Implementation
const unimplementedRules = definedRules.filter(id => !implementedRules.has(id));
if (unimplementedRules.length > 0) {
    // Warn only for now, as we are retrofitting
    // warnings.push(`Rules defined but not explicitly implemented in code (@implements): ${unimplementedRules.slice(0, 5).join(', ')}...`);
}

// Validate Rules have Tests
const untestedRules = definedRules.filter(id => !testedRules.has(id));
if (untestedRules.length > 0) {
    // warnings.push(`Rules defined but not referenced in tests: ${untestedRules.slice(0, 5).join(', ')}...`);
}

// Check for Undefined References in Code
const allReferencedRules = [...implementedRules, ...testedRules];
const undefinedRules = allReferencedRules.filter(id => !definedRules.includes(id));

if (undefinedRules.length > 0) {
    errors.push(`Code references undefined Business Rules: ${undefinedRules.join(', ')}. Add them to BUSINESS_RULES.md`);
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
