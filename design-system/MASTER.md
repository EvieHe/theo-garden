# Theo Garden Design System

## Art direction
Cinematic editorial memory archive. Quiet, intimate, tactile, premium. The interface should feel like entering a designed world, not opening a dashboard.

## Visual hierarchy
1. Photography / atmosphere carries the first impression.
2. Large editorial serif typography gives identity.
3. Glass is a restrained floating material for navigation and controls only.
4. Memory content remains visually primary.

## Palette
- Ink: #17212A
- Mist blue-gray: #91A2AD
- Warm ivory: #ECE9DF
- Muted slate: #667681
- Glass white: rgba(236,242,242,.19)
- Hairline: rgba(255,255,255,.48)

## Typography
- Display / editorial: Georgia fallback for now; high contrast serif, large optical scale, tight tracking.
- UI / metadata: Inter / Helvetica Neue / Arial, uppercase micro labels with generous tracking.
- Chinese body: system serif/sans should remain calm and readable; avoid decorative handwriting fonts.

## Material
Glass surfaces must use translucent fill + blur + subtle inner highlight + low-opacity border. Avoid stacking many glass cards. Glass should float over a scene, never become the scene.

## Motion
Motion tier: Standard to Complex only for key moments.
- Entry: staggered reveal, 700–1200ms, ease-out.
- Hover: 350–550ms, spring-like cubic bezier.
- Memory open: circular thumbnail expands toward story hero before navigation.
- Story scroll: restrained parallax, opacity and vertical reveal.
- Background: slow atmospheric drift only.
- Always respect prefers-reduced-motion.

## Photography
Muted saturation, soft contrast, atmospheric light, natural texture, editorial composition. Avoid generic bright stock photography, saturated travel imagery, or collage-like visual noise.

## Spacing
Low density. Large negative space is intentional. Major sections should breathe at 10–18vh vertically.

## Anti-patterns
- Dashboard grids as the dominant composition.
- Gradient-only backgrounds pretending to be atmosphere.
- Cartoon botanical assets.
- Excessive glass cards.
- Particle effects without narrative purpose.
- Fast looping animation.
- Every element moving at once.
- Decorative UI competing with photos and memories.

## Pre-delivery checks
- Does the first screen have one clear visual focal point?
- Does photography/material feel premium rather than stock/template-like?
- Are motion moments concentrated around entry, hover, transition and scroll storytelling?
- Does the page still read clearly with motion disabled?
- Are empty states and content states equally intentional?
