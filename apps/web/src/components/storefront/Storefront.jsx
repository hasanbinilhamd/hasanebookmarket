import React, {Suspense, useEffect, useMemo, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import LibraryScene from '../library/LibraryScene';
import StorefrontChrome from './StorefrontChrome';
import BookDetail from './BookDetail';
import {getBooks} from '../../services/books';

function webglAvailable(){try{let c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch{return false}}
export default function Storefront(){
 const books=useMemo(()=>getBooks(),[]);
 const [selected,setSelected]=useState(null),[reset,setReset]=useState(0),[mobile,setMobile]=useState(window.innerWidth<700),[ready,setReady]=useState(false);const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches; const hasWebgl=useMemo(webglAvailable,[]);const book=books.find(b=>b.id===selected);
 useEffect(()=>{const resize=()=>setMobile(window.innerWidth<700);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
 useEffect(()=>{const fn=e=>{if(e.key==='Escape')setSelected(null)};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[]);
 const select=id=>{setSelected(id);setReset(r=>r+1)};
 return <main className={'app '+(selected?'is-selected':'')}>
  {hasWebgl?<Canvas className="scene" camera={{position:[0,.4,13],fov:38,near:.1,far:100}} dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={()=>setReady(true)}><Suspense fallback={null}><LibraryScene books={books} selected={selected} onSelect={select} mobile={mobile} resetSignal={reset} reduced={reduced}/></Suspense></Canvas>:<div className="fallback">Your browser doesn’t support WebGL. Please enable hardware acceleration or try a modern browser to explore the library.</div>}
  <div className="vignette"/>
  <StorefrontChrome selected={selected}/>
  <div className="accessible-books" aria-label="Choose a book">{books.map(b=><button key={b.id} onClick={()=>select(b.id)}>{b.title}</button>)}</div>
  <BookDetail book={book} books={books} onBack={()=>setSelected(null)} onReset={()=>setReset(r=>r+1)}/>
  {!ready&&hasWebgl&&<div className="loading"><span>✳</span><p>OPENING THE READING ROOM</p></div>}
 </main>
}
