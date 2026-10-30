import React from 'react';

export default function BookDetail({book, books, onBack, onReset}) {
 return (
  <div className={'detail '+(book?'visible':'')} aria-hidden={!book}>
   {book&&<><button className="back" onClick={()=>onBack()}><span>←</span> BACK TO THE COLLECTION</button><div className="inspect"><span className="inspect-circle">↔</span><span>DRAG TO ROTATE</span><button onClick={()=>onReset()}>RESET VIEW</button></div><section className="detail-panel"><div className="detail-overline"><span>THE COLLECTION</span><span>NO. {String(books.indexOf(book)+1).padStart(2,'0')} / 06</span></div><div className="detail-rule"/><div className="detail-category">{book.category} <span>✳</span> SAMPLE EDITION</div><h2>{book.title}</h2><p className="subtitle">{book.subtitle}</p><p className="author">BY {book.author.toUpperCase()}</p><p className="description">{book.description}</p><div className="detail-rule"/><div className="detail-columns"><div><h3>IN THIS VOLUME</h3><ul>{book.topics.map(t=><li key={t}>{t}</li>)}</ul></div><div><h3>FOR THE CURIOUS</h3><p>{book.audience}</p><h3>WHAT YOU’LL LEARN</h3><ul>{book.outcomes.map(t=><li key={t}>{t}</li>)}</ul></div></div><div className="detail-rule"/><div className="metadata"><span>PDF FORMAT</span><span>{book.pages} PAGES</span><span>{book.language.toUpperCase()}</span><span>UPDATED {book.updated}</span></div><div className="price-row"><div><small>CATALOG PREVIEW</small><strong>{book.price_label}</strong></div><span className="sample-note">Sample content · Not for sale</span></div></section></>}
  </div>
 );
}
