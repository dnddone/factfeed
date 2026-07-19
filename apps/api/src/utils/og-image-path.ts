/**
 * Rendered on-demand per request and CDN-cached (immutable — a post's
 * content never changes) rather than stored as a static asset.
 */
export const ogImagePath = (postId: string): string => `/api/og/${postId}`;
