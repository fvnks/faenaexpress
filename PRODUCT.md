# PRODUCT.md — Facturas (Facturas Module)

## Product Overview

**Facturas** is the invoicing module of a Chilean ERP system for small-to-medium businesses. It handles purchases, sales, expenses, bank reconciliation, and tax compliance (IVA 19%) in Chilean pesos (CLP). The module is used by business owners and accountants who spend hours daily in the system.

## Target Users

- **Primary**: Business owners (dueños) who need to track their finances daily
- **Secondary**: Accountants (contadores) who manage books and tax compliance
- **Context**: Chilean market, CLP currency, 19% IVA, Spanish language

## Core User Jobs

1. **Record & track purchases** — Import from SII, match with bank, track payment status
2. **Record & track sales** — Issue invoices/boletas, track collection status
3. **Record expenses** — Track who paid what, reimbursement tracking
4. **Bank reconciliation** — Match bank movements to purchases/sales/expenses
5. **Tax compliance** — Generate IVA books (libro compras/ventas), DTE management
6. **Reports & analysis** — Cash flow, pending payments, top clients, expenses by area

## Key Differentiators

1. **Chile-specific**: CLP currency, 19% IVA, SII integration (RCV, DTE, DTE import)
2. **Who paid what**: Every expense tracks who paid it; reimbursement tracking built-in
7. Bank reconciliation with auto-matching
8. SII integration (RCV import, DTE XML import, CAF management)
9. Chilean payroll module (RRHH) as separate module

## Current State

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma 7
- **Auth**: Custom session-based, roles: ADMIN, ACCOUNTANT, SALES, VIEWER
- **Database**: PostgreSQL + Prisma 7 with driver adapter
- **UI**: Migrated to Astryx design system (v0.7.16), 19 components wrapped
- **Landing page**: Exists at `/` (saas mode) with sections: Hero, Problema, Servicios, Cómo funciona, Confianza, CTA, Footer

## Known Visual Issues (to address in redesign)

1. **Landing page**: Currently uses custom components + Astryx mix; needs visual consistency
2. **Color system**: Current globals.css has light/dark tokens but needs to align with DESIGN.md palette exactly
3. **Landing sections**: Some sections still use raw Tailwind classes instead of Astryx components
4. **Missing design tokens**: Landing components use hardcoded colors instead of CSS variables from DESIGN.md
5. **Responsive behavior**: Some landing sections don't follow RHYTHM 2 (responsive density changes)

## Redesign Goals

1. **Align landing page with DESIGN.md**: Use exact color tokens, typography, spacing from DESIGN.md
2. **Component consistency**: Replace raw Tailwind with Astryx components + design tokens
3. **Accessibility**: Focus states, skip links, ARIA, color contrast (4.5:1 minimum)
5. **Motion**: Respect prefers-reduced-motion, only functional animation (120-180ms)
6. **Typography**: IBM Plex Sans with tabular-nums for numbers
6. **Responsive**: RHYTHM 2 - density changes at breakpoints, not just layout

## Success Criteria

- Landing page passes Web Interface Guidelines audit
- Light/dark mode both verified (R-34)
- Color contrast ≥ 4.5:1 for text, 3:1 for UI elements
- Motion respects prefers-reduced-motion
- Tabular numbers in all monetary displays
- Skip link present and functional
- Focus visible on all interactive elements