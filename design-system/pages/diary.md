# Diary Page

Extends `../MASTER.md`.

## Purpose
A visual calendar that lets dates with memories become portals. Clicking a memory should feel like entering that day, not opening a record.

## Calendar composition
- No traditional calendar grid lines.
- Preserve recognizable 7-column calendar rhythm.
- Photo memories are circular photographic nodes.
- Empty days are bare date numerals.
- Text-only memories should stay close to the empty-date visual language rather than introducing a fake note card or icon. Use the date itself as the marker: subtle serif/italic emphasis, a tiny ink dot/hairline trace, and a quiet hover halo.
- The distinction hierarchy is: photo memory = strongest visual signal; text-only memory = secondary editorial signal; empty day = quietest.
- Keep generous negative space around the calendar.
- Month titles must fit their column responsively; long names such as February/September should scale within the available inline size instead of clipping or wrapping.
- Visual world: cream paper + restrained film photography. Palette centers on warm ivory, sand, muted brown and ink.
- Background uses softly washed photography, paper-like grain and warm moving light. The photograph is atmosphere, not content.

## Day story composition
The day page is a content-driven editorial layout system, not a fixed gallery.
- 0 images: text-first editorial essay with oversized pull quote.
- 1 image: dominant hero image plus narrow text column.
- 2 images: one protagonist image + one offset supporting image; never equal 50/50 tiles.
- 3 images: protagonist + tall supporting + small detail image, deliberately asymmetric.
- 4–6 images: visual essay sequence: opening spread, offset pair, pull quote, cinematic full-width frame, closing polaroid-like frame.
- 7+ images: preserve protagonist/supporting hierarchy first; overflow images may enter a restrained film/contact-sheet section later.
- Text and images remain mostly unboxed. Glass is reserved for floating navigation and metadata.

## Layout engine principle
Select layout from content shape first: image count, text presence, aspect ratios and eventually image salience. The same design language should produce different compositions for different days.

## Motion moments
1. Calendar entrance: month copy, glass calendar, then date cells stagger in.
2. Pointer: subtle localized warm light and very small background parallax.
3. Photo-memory hover: lift, slight rotation, glass highlight shift, image zoom and temporary recovery of image saturation.
4. Text-memory hover: only a restrained halo + ink-trace expansion; do not imitate the photo-node motion.
5. Photo-memory click: circular node expands toward story-hero proportions before navigation.
6. Text-memory click: short fade/scale transition because there is no image object to spatially expand.
7. Day hero: image and oversized date move at different scroll speeds.
8. Story spreads: reveal once on intersection; image settles after the copy.
9. Background: extremely slow photographic drift + moving film-light wash; never decorative particle overload.

## Glass usage
Allowed: calendar surface, month switcher, story nav, tiny date badge.
Avoid: wrapping diary text or each story image in glass cards.

## Anti-patterns
- No nine-grid / equal-size photo gallery as the main day composition.
- No repeated image-text-card template down the page.
- No fake scrapbook stickers, hearts, sticky-note icons, or decorative nostalgia props.
- No aggressive parallax, bouncing or continuous UI motion competing with photographs.
