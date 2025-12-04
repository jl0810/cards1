#!/usr/bin/env node

/**
 * Folder Structure Validator
 * 
 * Enforces standardized folder structure per global engineering rules:
 * - Route groups in app/: (auth), (marketing), (dashboard)
 * - Server Actions in app/actions/
 * - Components follow: ui/, layout/, forms/, [domain]/, shared/
 * - No loose files in wrong locations
 */

import fs from 'fs';
import path from 'path';

const errors = [];
const warnings = [];

console.log('📁 Validating folder structure...\n');

// --- Rule 1: Check for route groups in app/ directory ---
console.log('1️⃣  Checking Next.js route groups...');

const appDir = 'app';
const requiredRouteGroups = ['(auth)', '(marketing)', '(dashboard)'];
const recommendedDirs = ['api', 'actions'];

if (fs.existsSync(appDir)) {
    const appContents = fs.readdirSync(appDir);

    // Check for route groups
    const existingRouteGroups = appContents.filter(item =>
        item.startsWith('(') && item.endsWith(')')
    );

    const missingRouteGroups = requiredRouteGroups.filter(
        group => !existingRouteGroups.includes(group)
    );

    if (missingRouteGroups.length > 0) {
        warnings.push(
            `Missing recommended route groups in app/: ${missingRouteGroups.join(', ')}\n` +
            `   Route groups improve layout sharing and organization.`
        );
    }

    // Check for recommended directories
    const missingDirs = recommendedDirs.filter(
        dir => !appContents.includes(dir)
    );

    if (missingDirs.length > 0) {
        warnings.push(
            `Missing recommended directories in app/: ${missingDirs.join(', ')}`
        );
    }

    console.log(`   ✓ Found ${existingRouteGroups.length} route groups`);
    console.log(`   ✓ Found ${appContents.filter(d => recommendedDirs.includes(d)).length}/${recommendedDirs.length} recommended dirs`);
}

// --- Rule 2: Server Actions should be in app/actions/ ---
console.log('\n2️⃣  Checking Server Actions location...');

const actionsDir = 'app/actions';
if (fs.existsSync(actionsDir)) {
    const actionFiles = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts'));
    console.log(`   ✓ Found ${actionFiles.length} Server Action files in app/actions/`);
} else {
    warnings.push('app/actions/ directory not found - Server Actions should be centralized here');
}

// Check for Server Actions in wrong locations (app/ root)
if (fs.existsSync(appDir)) {
    const rootFiles = fs.readdirSync(appDir)
        .filter(item => {
            const itemPath = path.join(appDir, item);
            return fs.statSync(itemPath).isFile() &&
                item.endsWith('.ts') &&
                item !== 'layout.tsx' &&
                item !== 'page.tsx' &&
                item !== 'error.tsx' &&
                item !== 'loading.tsx' &&
                item !== 'not-found.tsx' &&
                item !== 'global-error.tsx';
        });

    if (rootFiles.length > 0) {
        warnings.push(
            `Found ${rootFiles.length} files in app/ root: ${rootFiles.join(', ')}\n` +
            `   Consider moving Server Actions to app/actions/ and utilities to lib/`
        );
    }
}

// --- Rule 3: Component organization ---
console.log('\n3️⃣  Checking component organization...');

const componentsDir = 'components';
const requiredComponentDirs = ['ui', 'layout', 'shared'];
const validComponentDirs = [...requiredComponentDirs, 'forms', 'velocity', 'admin', 'dashboard', 'marketing', 'billing', 'settings'];

if (fs.existsSync(componentsDir)) {
    const componentContents = fs.readdirSync(componentsDir);

    // Check for required directories
    const existingRequired = requiredComponentDirs.filter(
        dir => componentContents.includes(dir)
    );

    const missingRequired = requiredComponentDirs.filter(
        dir => !componentContents.includes(dir)
    );

    if (missingRequired.length > 0) {
        warnings.push(
            `Missing required component directories: ${missingRequired.join(', ')}\n` +
            `   These are standard directories per global rules.`
        );
    }

    // Check for loose component files in components/ root
    const looseFiles = componentContents.filter(item => {
        const itemPath = path.join(componentsDir, item);
        return fs.statSync(itemPath).isFile() &&
            (item.endsWith('.tsx') || item.endsWith('.ts'));
    });

    if (looseFiles.length > 0) {
        errors.push(
            `Found ${looseFiles.length} loose component files in components/ root: ${looseFiles.join(', ')}\n` +
            `   Components must be organized in subdirectories:\n` +
            `   - components/ui/ for UI primitives\n` +
            `   - components/layout/ for layout components\n` +
            `   - components/shared/ for shared utilities\n` +
            `   - components/[domain]/ for domain-specific components`
        );
    }

    // Check for non-standard directories
    const nonStandardDirs = componentContents.filter(item => {
        const itemPath = path.join(componentsDir, item);
        return fs.statSync(itemPath).isDirectory() &&
            !validComponentDirs.includes(item);
    });

    if (nonStandardDirs.length > 0) {
        warnings.push(
            `Non-standard component directories found: ${nonStandardDirs.join(', ')}\n` +
            `   Ensure these are domain-specific and follow naming conventions.`
        );
    }

    console.log(`   ✓ Required directories: ${existingRequired.length}/${requiredComponentDirs.length}`);
    console.log(`   ✓ Loose files in root: ${looseFiles.length}`);
}

// --- Rule 4: lib/ directory structure ---
console.log('\n4️⃣  Checking lib/ organization...');

const libDir = 'lib';
if (fs.existsSync(libDir)) {
    const libFiles = fs.readdirSync(libDir).filter(item => {
        const itemPath = path.join(libDir, item);
        return fs.statSync(itemPath).isFile();
    });

    const hasSubdirs = fs.readdirSync(libDir).some(item => {
        const itemPath = path.join(libDir, item);
        return fs.statSync(itemPath).isDirectory();
    });

    console.log(`   ✓ Found ${libFiles.length} utility files in lib/`);

    if (libFiles.length > 20 && !hasSubdirs) {
        warnings.push(
            `lib/ has ${libFiles.length} files without subdirectories\n` +
            `   Consider organizing into lib/utils/, lib/api/, lib/validation/, etc.`
        );
    }
}

// --- Rule 5: hooks/ directory ---
console.log('\n5️⃣  Checking hooks/ organization...');

const hooksDir = 'hooks';
if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    // Check naming convention
    const invalidHookNames = hookFiles.filter(f => !f.startsWith('use-') && f !== 'index.ts');

    if (invalidHookNames.length > 0) {
        errors.push(
            `Hook files must start with 'use-': ${invalidHookNames.join(', ')}\n` +
            `   Rename to follow React hook naming convention.`
        );
    }

    console.log(`   ✓ Found ${hookFiles.length} custom hooks`);
} else {
    warnings.push('hooks/ directory not found - create it for custom React hooks');
}

// --- Rule 6: types/ directory ---
console.log('\n6️⃣  Checking types/ organization...');

const typesDir = 'types';
if (fs.existsSync(typesDir)) {
    const typeFiles = fs.readdirSync(typesDir).filter(f => f.endsWith('.ts') || f.endsWith('.d.ts'));
    console.log(`   ✓ Found ${typeFiles.length} type definition files`);
} else {
    warnings.push('types/ directory not found - recommended for shared TypeScript types');
}

// --- Output Results ---
console.log('\n' + '═'.repeat(60));

if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix):');
    errors.forEach(err => console.log(`  ${err}\n`));
}

if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (recommended fixes):');
    warnings.forEach(warn => console.log(`  ${warn}\n`));
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Folder structure complies with global engineering standards!');
}

console.log('═'.repeat(60));

// Exit with error if there are critical violations
if (errors.length > 0) {
    process.exit(1);
}

// Exit successfully (warnings don't block)
process.exit(0);
