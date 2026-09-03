/**
 * Resolves a public asset path against Vite's configured deployment base.
 *
 * Game data intentionally keeps stable, site-root-like paths such as
 * `/assets/tags/valor.png`.  Resolving only at the rendering boundary keeps
 * those data definitions independent from whether the game is served locally
 * or from its GitHub Pages subdirectory.
 */
export function resolvePublicAssetPath(path) {
  if (!path.startsWith('/')) return path;

  const baseUrl = import.meta.env?.BASE_URL ?? '/';
  return `${baseUrl.replace(/\/?$/, '/')}${path.slice(1)}`;
}
