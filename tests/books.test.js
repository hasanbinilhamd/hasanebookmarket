import test from 'node:test';
import assert from 'node:assert/strict';
import {getBooks, getBookBySlug} from '../src/services/books.js';

test('mock service supplies six stable sample books and canonical fields', () => {
  const books=getBooks();
  assert.equal(books.length,6);
  assert.equal(new Set(books.map(book=>book.id)).size, books.length);
  const fields=['id','slug','title','author','description','category','price','currency','cover_image','preview_images','page_count','publication_status','created_at','updated_at'];
  for(const book of books) {
    for(const field of fields) assert.ok(Object.hasOwn(book,field), `${book.id}: missing ${field}`);
    assert.equal(book.publication_status,'sample');
    assert.equal(book.price,null);
    assert.equal(book.price_label,'Price on request');
    assert.ok(Array.isArray(book.preview_images));
    assert.equal(getBookBySlug(book.slug),book);
    assert.ok(book.motif && book.color && book.accent);
  }
  assert.equal(getBookBySlug('missing'),null);
});
