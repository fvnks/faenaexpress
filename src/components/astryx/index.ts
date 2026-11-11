/**
 * Astryx-style design system components for Facturas ERP.
 *
 * Inspiration: meta/astryx — composition-first design system built for
 * people and agents working together.
 *
 * Principles applied here:
 * - Composition first: parts (Button, Card, Stack, Text…) combine freely.
 * - Theming via CSS custom properties: tokens live in globals.css.
 * - No styling lock-in: Tailwind + CSS vars, no build plugin.
 * - Predictable API: same conventions across all components.
 */
export { default as Card } from "./card";
export type { CardProps } from "./card";
export { Button, IconButton, TextButton, type ButtonProps } from "./button";
export { Text, Heading, Label, Caption } from "./typography";
export { Stack, Grid, Box } from "./layout";
