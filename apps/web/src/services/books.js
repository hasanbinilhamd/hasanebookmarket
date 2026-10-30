import {catalog} from '../catalog.js';

// The mock adapter retains art-direction fields used by the 3D scene. The
// canonical fields are separate so a future API adapter can expose the same
// shape without changing the presentation layer. Monetary amounts are not
// invented: sample prices, currency and dates are unknown (null).
function toBook(sample) {
  return {
    ...sample,
    slug: sample.id,
    price: null,
    price_label: sample.price,
    currency: null,
    cover_image: sample.coverImage,
    preview_images: [],
    page_count: null,
    publication_status: 'sample',
    created_at: null,
    updated_at: null,
  };
}
const books = catalog.map(toBook);
export function getBooks() { return books; }
export function getBookBySlug(slug) { return books.find(book => book.slug === slug) ?? null; }
