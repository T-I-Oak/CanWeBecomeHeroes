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
# タグ図案レビュー

`dev_tag_icon_review.html` は、タグの共通Canvas Rendererを使い、最小の雑魚Chipと同じ約27pxの円盤・約19pxの図案を全15種で比較する、ブランチ運用中だけの手動レビュー画面です。上段は実表示サイズ、下段は同じ描画内容を4倍にした確認用表示です。候補確定と本アセット反映後、マージ前に削除します。
