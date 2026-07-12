---
name: Nova Nuggets Website
description: Full-stack AI that ships, from strategy to production.
colors:
  orbital-ink: "#1a1612"
  warm-paper: "#f5edde"
  signal-terra: "#c9582c"
  live-ember: "#e27a4d"
  verified-moss: "#6ea888"
typography:
  display:
    fontFamily: "Cabinet Grotesk, sans-serif"
    fontSize: "clamp(3.25rem, 7.8vw, 7.8rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Cabinet Grotesk, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "DM Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  control: "2px"
  panel: "18px"
  capsule: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.orbital-ink}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  button-secondary:
    backgroundColor: "{colors.orbital-ink}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  system-panel:
    backgroundColor: "{colors.orbital-ink}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: Nova Nuggets Website

## Overview

**Creative North Star: "The Operational Orbit"**

The Nova Nuggets website should feel like entering a live operating model for an agent-enabled organisation. The experience is dark, warm, precise, and spatial: workflow decisions orbit a controlled core; progress is visible; evidence accumulates as the visitor moves from diagnosis to operation. It is immersive because the system reveals itself through depth, motion, and interaction, not because content is hidden behind spectacle.

The visual language rejects generic AI tool marketing, static brochure pages, repetitive SaaS card grids, nested glass panels, and consultancy theatre. Every composed surface should communicate a boundary, a relationship, a decision, or a measurable progression.

**Key Characteristics:**

- Warm technical darkness rather than cold cyberpunk black.
- Oversized, compact display typography paired with readable operational prose.
- Hairline grids, orbital paths, evidence rails, and controlled asymmetry.
- One dominant visual idea per viewport, with quieter connective tissue between it.
- Purposeful transform-and-opacity motion with a complete reduced-motion path.

## Colors

The palette uses toasted near-black and warm paper as the environment, terra as the operating signal, ember for active focus, and moss only for verified or healthy states.

### Primary

- **Signal Terra:** the scarce action and trajectory colour. Use it for primary system accents, active journey states, and decisive interaction feedback.

### Secondary

- **Live Ember:** a brighter focus colour for keyboard rings, high-attention microstates, and active orbital markers.
- **Verified Moss:** reserved for factual readiness, completed checks, healthy status, and proof. Never use it decoratively.

### Neutral

- **Orbital Ink:** the primary environment and dark text on paper surfaces.
- **Warm Paper:** primary text, high-contrast buttons, and deliberate light chapters.

**The Signal Scarcity Rule.** Terra and ember identify action or change. If every surface is orange, the system has lost its hierarchy.

**The Evidence Green Rule.** Moss may only represent a verified state, never aspiration.

## Typography

**Display Font:** Cabinet Grotesk (with a sans-serif fallback)  
**Body Font:** Plus Jakarta Sans (with a sans-serif fallback)  
**Label/Mono Font:** DM Mono (with a monospace fallback)

**Character:** Cabinet Grotesk makes the company feel direct and constructed, Plus Jakarta Sans keeps complex enterprise explanations humane, and DM Mono provides the instrumentation layer. The three voices must remain distinct.

### Hierarchy

- **Display** (800, fluid 3.25rem to 7.8rem, 0.92): one dominant proposition per hero or chapter.
- **Headline** (800, fluid 2.4rem to 5.4rem, 0.96): section decisions and outcome statements.
- **Title** (700, 1.25rem to 2rem, 1.15): offers, stages, and artifacts.
- **Body** (400, 1rem, 1.65): explanatory prose capped around 70 characters per line.
- **Label** (400, 0.72rem, 0.08em tracking): short operational metadata, sequence numbers, states, and controls.

**The Three Voices Rule.** Display sells the decision, body explains it, mono proves or controls it. Never write long body copy in mono.

## Elevation

The system is flat by default and creates depth through tonal layers, hairline borders, spatial overlap, local light, and moving orbital geometry. Shadows are ambient and broad; they never mimic raised material cards. Blur is reserved for the floating site header where separating navigation from moving content is functional.

**The Structural Depth Rule.** A panel earns elevation only when it represents a distinct operating layer, active control, or persistent navigation surface.

## Components

### Buttons

- **Shape:** precise, almost square controls (2px radius).
- **Primary:** warm paper on orbital ink with 15px by 20px padding.
- **Hover / Focus:** short exponential ease, small directional translation where appropriate, and an ember focus outline.
- **Secondary:** transparent or ink surfaces with a restrained warm-paper hairline.

### Chips

- **Style:** mono labels, one-pixel borders, minimal radius, and compact horizontal padding.
- **State:** active chips use a tonal terra field plus a visible text or marker change; colour is never the only cue.

### Cards / Containers

- **Corner Style:** use 18px only for immersive system instruments and large grouped panels. Editorial and comparison content stays rectangular or separated by rules.
- **Background:** ink-toned layers or paper chapters, not translucent glass stacks.
- **Shadow Strategy:** ambient only, following the Structural Depth Rule.
- **Border:** one-pixel warm-paper hairlines at low opacity.
- **Internal Padding:** 20px to 32px, varied by information density rather than repeated mechanically.

### Inputs / Fields

- **Style:** quiet filled or ink surfaces with a one-pixel border and 2px to 8px radius.
- **Focus:** ember outline plus a clear border shift.
- **Error / Disabled:** error text and iconography accompany colour; disabled controls remain readable and state why they are unavailable.

### Navigation

The desktop header is a single floating capsule with restrained blur. Active routes use a textual and line-state change. Mobile navigation becomes an explicit menu with large tap targets, no horizontal overflow, and no hidden critical action.

### Operational Orbit

The signature visual maps a page-specific core to three or four surrounding decisions, signals, or evidence points. It may animate rotation, pulses, or path progress using transforms and opacity. The meaning remains available as text and the complete composition becomes static under reduced motion.

## Do's and Don'ts

### Do:

- **Do** move every route through Diagnose, Design, Deploy, Operate, and Prove.
- **Do** use real artifacts, diagrams, system boundaries, and proof registers as imagery.
- **Do** begin with a locally controlled first workflow and show how it scales into an AI-enabled organisation.
- **Do** use cards only when an item has a real boundary, comparable state, or interaction.
- **Do** preserve keyboard access, WCAG 2.1 AA contrast, and `prefers-reduced-motion` behavior.

### Don't:

- **Don't** use generic AI tool marketing built from purple gradients, glowing chatbot imagery, and unsupported superlatives.
- **Don't** ship static brochure pages that isolate information instead of moving the visitor through a decision journey.
- **Don't** build repetitive SaaS card grids, nested glass panels, or interchangeable icon-above-heading sections.
- **Don't** imply that consultancy output ends with a roadmap; always connect assessment to deployment and operation.
- **Don't** hijack scrolling, obscure content behind motion, or ignore reduced-motion preferences.
- **Don't** fabricate customer proof, inflate metrics, or make claims that exceed deployable product truth.
