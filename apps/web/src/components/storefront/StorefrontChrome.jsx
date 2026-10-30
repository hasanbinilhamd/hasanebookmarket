import React from 'react';

export default function StorefrontChrome({selected}) {
 return <>
  <header className="topbar"><div className="brand"><span className="brand-icon">✳</span><div><span className="brand-name">THE READING ROOM</span><span className="brand-sub">A LIBRARY FOR CURIOUS MINDS</span></div></div><div className="top-right"><span className="dot"/> AN INDEPENDENT DIGITAL LIBRARY <span className="top-number">EST. MMXXIV</span></div></header>
  <div className="side-label"><span>AN INVITATION TO EXPLORE</span><i/></div>
  <div className="collection-intro" aria-hidden={!!selected}><div className="eyebrow"><span className="line"/> THE READING ROOM <span className="little-star">✳</span> COLLECTION NO. 01</div><h1>A little more to <em>discover.</em></h1><p>A collection of ideas, made for curious minds.</p></div>
  <div className="collection-footer" aria-hidden={!!selected}><div className="footer-left"><span className="circle-icon">↗</span><div><strong>THE COLLECTION</strong><small>Six volumes to explore</small></div></div><div className="footer-center"><span className="mouse-icon"/> SELECT A BOOK TO EXPLORE</div><div className="footer-right"><span>01</span><div className="footer-line"/><span>06</span></div></div>
 </>;
}
