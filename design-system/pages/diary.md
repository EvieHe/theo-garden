# Diary Page

Extends `../MASTER.md`.

## Purpose
A visual calendar that lets dates with memories become portals, while the same page can also be read vertically as a living monthly photo journal.

## Navigation model
- Horizontal gesture on a month calendar changes the month. Support trackpad horizontal wheel and pointer/touch swipe, with a clear movement threshold so vertical reading is not hijacked.
- Vertical scroll is narrative: month calendar → every photo/note from that month → next month calendar → next month memories.
- The floating month control mirrors the month calendar currently in view and remains an accessible button fallback for horizontal navigation.
- Deep links preserve `year` and `month`.

## Calendar composition
- No traditional calendar grid lines.
- Preserve recognizable 7-column calendar rhythm.
- Photo memories are circular photographic nodes.
- Empty days are bare date numerals.
- Text-only memories stay close to the empty-date language: date-led editorial emphasis only, never a fake note card or scrapbook icon.
- Distinction hierarchy: photo memory strongest; text-only memory secondary; empty day quietest.
- Keep generous negative space around the calendar.
- Month titles must fit their column responsively; long names such as February/September scale within available inline size instead of clipping or wrapping.
- Visual world: cream paper + restrained film photography. Palette centers on warm ivory, sand, muted brown and ink.
- Background uses softly washed photography, paper-like grain and warm moving light. The photograph is atmosphere, not content.

## Monthly memory stream
- After each calendar, show all active entries from that month in chronological order.
- Group entries by day. The day number is oversized and editorial, not a utility badge.
- Do not use a card grid. Alternate image/copy composition and let multiple images overlap in a controlled magazine rhythm.
- Every photograph gets a small adjacent time caption. Prefer EXIF `DateTimeOriginal` / `DateTimeDigitized`; when unavailable, explicitly label the entry timestamp as `Recorded` rather than pretending it is capture time.
- Body copy remains unboxed, readable, and secondary to photography.
- Lazy-load photos and defer EXIF reads until images approach the viewport.

## Day story composition
The day page remains a content-driven editorial layout system, not a fixed gallery.
- 0 images: text-first editorial essay with oversized pull quote.
- 1 image: dominant hero image plus narrow text column.
- 2 images: one protagonist image + one offset supporting image; never equal 50/50 tiles.
- 3 images: protagonist + tall supporting + small detail image, deliberately asymmetric.
- 4–6 images: visual essay sequence: opening spread, offset pair, pull quote, cinematic full-width frame, closing polaroid-like frame.
- 7+ images: preserve protagonist/supporting hierarchy first; overflow images may enter a restrained film/contact-sheet section later.

## Motion moments
1. Month change: directional slide with exit slightly faster than enter, preserving spatial meaning.
2. Calendar entrance: month copy, glass calendar, then date cells stagger in.
3. Pointer: subtle localized warm light and very small background parallax.
4. Photo proximity: maximum ~2° perspective response and ~5px lift; never chase the pointer aggressively.
5. Photo-memory hover: recover a little saturation and depth.
6. Text-memory hover: restrained halo/ink trace only.
7. Day story: image/date parallax and one-time section reveals.
8. Always respect `prefers-reduced-motion`.

## Glass usage
Allowed: calendar surface, month switcher, story nav, tiny metadata.
Avoid: wrapping diary text, monthly entries, or every story image in glass cards.

## Anti-patterns
- No nine-grid / equal-size photo gallery as the main composition.
- No repeated image-text-card template down the page.
- No fake scrapbook stickers, hearts, sticky-note icons, or decorative nostalgia props.
- No horizontal swipe handler that steals normal vertical scrolling.
- No timestamp presented as photo capture time unless EXIF supports it.
- No aggressive parallax, bouncing, or continuous motion competing with photographs.
