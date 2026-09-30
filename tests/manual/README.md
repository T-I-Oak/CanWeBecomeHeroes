# Localization review

Start the normal Vite development server and open
`/CanWeBecomeHeroes/tests/manual/localization.html`.
This is a development-only entry, not included in the normal production build.

The page uses the production repository and information-window renderer. Language selection uses the shared setting, so restore the original language after reviewing.
The Detail selector covers areas, facilities, statuses, tags, terms, items, heroes, and level-2 unique skills (70 cases).
Item previews use a representative icon and tags; this fixture verifies localized text and layout, not individual item artwork.

Reviewed at 1280×720, 800×600, and 390×844: no horizontal window overflow or out-of-viewport window bounds after the responsive fixes. Long content scrolls vertically. Hero, tag-skill, and facility details were also visually inspected at the smallest size. Enemy details were previously checked in the game.

Run `node scripts/review-localization.mjs` to print bilingual prose for review.
Run `node --test` for resource integrity, translated references, and state-preservation regressions.
Public deployment verification is handled by the user.
