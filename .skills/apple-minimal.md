---
name: apple-minimal
description: >
  React Bits Pro Apple Minimal Design Skill (@reactbits-pro/skill-apple-minimal).
  Enforces Cupertino-grade minimalist aesthetics, frosted glassmorphism (backdrop-blur-2xl),
  hairline 1px border highlights, pure obsidian dark canvases, restrained color discipline,
  large type scale with negative tracking, and buttery smooth physics.
---

# Apple Minimal Design Guidelines (@reactbits-pro/skill-apple-minimal)

### Core Philosophy:
1. **The Product as the Only Hero**:
   - Ruthless visual discipline and distraction-free framing.
   - Restraint over decorative clutter. Generous, intentional negative space.
   - Content and interactive elements breathe without claustrophobic borders.

2. **Canvases & Surfaces (Frosted Glassmorphism)**:
   - Primary Canvas: Deep pitch obsidian `#000000` / `#09090b` with subtle ambient glow mesh (`radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06), transparent 70%)`).
   - Cards & Sheets: Frosted glass `bg-white/[0.04]` or `bg-zinc-900/40` with `backdrop-blur-2xl`.
   - Dual-rim beveled edge highlights: `border border-white/[0.08]` with subtle top highlight `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
   - Radii: Fluid squircle corners (`rounded-2xl` to `rounded-3xl` for cards, `rounded-full` for pill tags and buttons).

3. **Color Restraint**:
   - Pure Monochromatic Base: Whites, silvery grays, and deep pitch blacks.
     - Primary text: `#FFFFFF`
     - Secondary text: `rgba(255, 255, 255, 0.65)`
     - Muted/subtext: `rgba(255, 255, 255, 0.4)`
   - Precision Semantic Accents (inspired by SF Pro system colors):
     - Accent Blue: `#2997ff` / `#0071e3`
     - Emerald Green: `#30d158`
     - Radiant Amber: `#ffd60a`
     - Signal Red: `#ff453a`
     - Royal Indigo: `#bf5af2`

4. **Typography & Hierarchy**:
   - Heavy negative tracking on large headlines (`tracking-[-0.03em]`, `font-semibold` or `font-bold`).
   - Micro badges: Pill-shaped `text-[10px] tracking-[0.12em] uppercase font-semibold text-white/70 bg-white/[0.06] border border-white/[0.08]`.
   - Clean, readable metric data with tabular numbers (`font-mono` where precision is needed).

5. **Tactile Micro-Interactions**:
   - Subtle spring physics with scale dampening (`hover:scale-[1.01] active:scale-[0.98] transition-all duration-200`).
   - Buttery smooth transitions without jarring hard offsets or harsh comic shadows.
