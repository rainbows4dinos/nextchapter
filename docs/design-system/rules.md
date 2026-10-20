# nextchapter Design System Rules

## Purpose

These rules guide the design and implementation of UI throughout nextchapter.

The goal is to maintain a consistent visual language, reuse established patterns, and prevent design drift during AI-assisted development.

**Prefer existing nextchapter conventions over generic UI framework defaults.**

This document is intentionally lightweight. It is not a mandate to rebuild components, reorganize styles, or introduce new design-system infrastructure.

## 1. Design Sources of Truth

### Figma Foundations: Tokens and Styles

[Open nextchapter Foundations in Figma](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/nextchapter?node-id=45-3)

Canonical reference for:

- Colors and semantic color usage
- Typography and text styles
- Spacing and layout conventions
- Borders and corner radii
- Shadows and elevation
- Light and dark theme treatments

### Figma Canonical Components

[Open nextchapter Canonical Components in Figma](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/nextchapter?node-id=102-10517)

Canonical reference for:

- Component appearance and variants
- Default, hover, active, selected, disabled, and focus states
- Component anatomy and spacing
- Established interaction patterns

### Source Priority

When implementing UI, use the following order of reference:

1. Explicit requirements and supplied Figma designs for the current task.
2. Canonical Figma components and foundations.
3. Existing shared code components and design tokens.
4. Established patterns elsewhere in nextchapter.
5. New patterns only when none of the above adequately solves the problem.

If a canonical Figma design conflicts with the current code implementation, identify the discrepancy and prefer the intended Figma design. Avoid silently changing unrelated instances or shared components.

If Figma is unavailable, use existing code conventions and report any assumptions.

## 2. Typography and Labeling

- Use **APA Title Case** for short UI labels, buttons, tabs, menu items, filter options, and section headings.
- Use sentence case for descriptive text, helper text, validation messages, placeholders, and longer prose.
- Do not use all-caps labels or automatic uppercase text transformations unless explicitly specified by a canonical component.
- Use established typography styles, font families, sizes, weights, and line heights.
- Do not introduce new typography variants when an existing style is appropriate.
- Preserve intentional capitalization of brands, product names, and technical terms.

## 3. Component Reuse

**Reuse before creating.**

Before implementing a new UI element:

1. Inspect the canonical Figma components.
2. Search the codebase for an existing equivalent.
3. Reuse the existing component and its variants where practical.
4. Extend an existing component when a legitimate new variant is required.
5. Create a new component only when no suitable pattern exists.

Specific conventions:

- Segmented controls should follow the established **Pill Tabs** component.
- Dropdowns and popovers should follow existing menu patterns.
- Buttons should reuse established button variants.
- Inputs, status badges, cards, and navigation controls should use their existing styles.
- Do not introduce a visually distinct version of an established component simply because it is easier to implement locally.

## 4. Color and Interaction States

- Use established semantic color tokens rather than arbitrary color values.
- Preserve consistent visual treatments across light and dark themes.
- Hover, selected, active, and focus states must be visually distinguishable.
- Maintain sufficient text and control contrast in every interaction state.
- Selected states should remain recognizable during hover.
- Preserve accessible keyboard focus indicators.
- Do not substitute browser or framework defaults for established component states without a reason.

Validate relevant components in their default, hover, active, selected, focus, disabled, and error states.

## 5. Borders, Radii, and Shadows

- Use established border widths, colors, and corner-radius tokens.
- Follow canonical Figma styles for component elevation.
- Dropdown menus and popovers should use the established **hard-shadow treatment**, not generic soft or diffuse shadows.
- Avoid introducing new `box-shadow` values when an existing shadow style is available.
- Keep shadows, borders, and elevation consistent between light and dark themes.
- Do not introduce new decorative effects without a design reference or explicit requirement.

## 6. Layout and Spacing

- Follow established spacing tokens and layout conventions.
- Match supplied Figma designs for hierarchy, alignment, density, and proportions.
- Prefer existing responsive patterns over arbitrary breakpoint behavior.
- Avoid unnecessary controls, decorative elements, and excessive whitespace.
- Preserve consistent relationships between page headers, toolbars, content regions, and primary actions.
- Do not make unrelated layout changes while implementing a focused feature.

## 7. Interaction Design

- Prefer immediate feedback and direct manipulation.
- Avoid unnecessary confirmation or Apply buttons for reversible, low-risk interactions.
- Use established interaction patterns wherever possible.
- Preserve keyboard accessibility and logical focus order.
- Ensure interactive elements have appropriate hit targets.
- Provide clear empty, loading, error, and disabled states where relevant.
- Do not introduce additional steps or configuration unless they solve a demonstrated usability problem.

## 8. Figma and Code Responsibilities

Figma is the canonical visual design reference. The codebase is the implementation of that design.

- Use Figma to resolve visual specifications and component conventions.
- Use existing code components to preserve behavior, accessibility, and implementation consistency.
- Do not assume Figma changes automatically synchronize with code.
- Do not generate or overwrite production components solely because a Figma component changed.
- Flag meaningful differences between canonical Figma designs and code implementations.
- Keep changes focused on the requested task unless broader changes are explicitly approved.

Automated token synchronization and Figma Code Connect integration are future enhancements, not requirements for ordinary UI work.

## 9. AI Agent Implementation Workflow

For any task that creates or modifies UI:

1. Read this document.
2. Inspect relevant Figma references when available.
3. Identify existing code components, tokens, and patterns.
4. Implement the smallest appropriate change using established conventions.
5. Validate visual appearance and interaction states.
6. Check light and dark themes and responsive behavior.
7. Report design-system inconsistencies, assumptions, or deviations.

### Avoid

- Inventing new component variants without checking existing ones.
- Introducing arbitrary CSS values where tokens exist.
- Using generic framework styling in place of nextchapter styling.
- Adding all-caps labels or inconsistent capitalization.
- Introducing soft shadows in place of canonical hard shadows.
- Recreating an existing component with different hover or selected states.
- Refactoring unrelated UI as part of a focused task.

### When Uncertain

Prefer existing nextchapter patterns.

If an important design decision cannot be resolved from Figma, the codebase, or this document, flag it rather than inventing a new convention.

## 10. Scope and Maintenance

This document is a practical implementation guide, not a complete design-system specification.

Update it when a recurring design decision needs clarification or an established convention changes.

Do not expand it with one-off implementation details, temporary workarounds, or speculative rules.

**The objective is consistent, intentional UI with minimal design and engineering overhead.**