# Build Issues and Resolution Plan

## Current Status
The React 19 upgrade and NextJS refactor has been completed, but there are build-time dependency issues that need resolution before deployment.

## Issues Identified

### 1. Missing Radix UI Dependencies
**Problem**: Shadcn UI components in the shared `components/ui/` directory depend on Radix UI packages that are not properly installed in the web app's dependency tree.

**Error Examples**:
```
Cannot find module '@radix-ui/react-accordion' or its corresponding type declarations
Cannot find module '@radix-ui/react-dropdown-menu' or its corresponding type declarations
Cannot find module '@radix-ui/react-select' or its corresponding type declarations
```

**Root Cause**: The web app's `package.json` has these dependencies listed, but they're not resolving correctly in the monorepo structure.

**Impact**: Build fails during TypeScript compilation phase.

### 2. Peer Dependency Warnings
**Problem**: React 19 upgrade introduced peer dependency mismatches with some packages.

**Affected Packages**:
- `next-themes`: expects React ^16.8 || ^17 || ^18, found 19.1.0
- `react-day-picker`: expects React ^16.8.0 || ^17.0.0 || ^18.0.0, found 19.1.0

**Impact**: Warnings during install, potential runtime issues.

### 3. Tailwind CSS Configuration
**Problem**: Missing or empty `content` configuration in Tailwind CSS.

**Error**: 
```
warn - The `content` option in your Tailwind CSS configuration is missing or empty.
warn - Configure your content sources or your generated CSS will be missing styles.
```

**Impact**: Missing styles in production build.

## Resolution Plan

### Phase 1: Dependency Resolution (High Priority)
1. **Install missing Radix packages in web app**:
   ```bash
   cd apps/web
   pnpm add @radix-ui/react-accordion @radix-ui/react-dropdown-menu @radix-ui/react-select
   # ... add other missing radix packages
   ```

2. **Alternative: Move shared UI components to web app**:
   - Copy `components/ui/` to `apps/web/src/components/ui/`
   - Update import paths in all components
   - Install Radix dependencies directly in web app

### Phase 2: Peer Dependency Updates (Medium Priority)
1. **Update incompatible packages**:
   - Find React 19 compatible versions of `next-themes` and `react-day-picker`
   - Update or replace if no compatible versions exist

2. **Test functionality**:
   - Verify dark mode toggle still works
   - Test date picker components

### Phase 3: Configuration Fixes (Low Priority)
1. **Fix Tailwind CSS configuration**:
   ```javascript
   // tailwind.config.js
   module.exports = {
     content: [
       './src/**/*.{js,ts,jsx,tsx}',
       '../../components/**/*.{js,ts,jsx,tsx}'
     ],
     // ... rest of config
   }
   ```

### Phase 4: Build Verification
1. **Test complete build pipeline**:
   ```bash
   pnpm build
   pnpm type-check
   pnpm lint
   ```

2. **Verify functionality**:
   - Server-side rendering works
   - Data fetching functions correctly
   - UI components render properly

## Workarounds Implemented

### 1. Simplified DrugTable Component
- Replaced Shadcn Table components with vanilla HTML table
- Used Tailwind CSS classes for styling
- Maintains same functionality without dependencies

### 2. Badge Component Replacement
- Replaced Shadcn Badge with simple span element
- Preserved visual design with Tailwind classes

### 3. TypeScript Fixes
- Added explicit type annotations for map function parameters
- Fixed Next.js 15 params Promise compatibility
- Updated component interfaces

## Next Steps
1. Choose between fixing dependencies vs. continuing with simplified components
2. If fixing dependencies: implement Phase 1 solutions
3. If keeping simplified: continue with current approach and update remaining components
4. Test in development environment before production deployment

## Technical Debt Notes
- Current simplified components work but lose some Shadcn benefits (accessibility, animations)
- Dependency resolution should be addressed for long-term maintainability
- Consider establishing clear component library strategy for the monorepo