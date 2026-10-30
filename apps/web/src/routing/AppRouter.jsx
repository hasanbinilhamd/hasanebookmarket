import React, {useEffect, useState} from 'react';
import Storefront from '../components/storefront/Storefront';
import {resolveRoute} from './routes';
import './placeholder.css';

const labels = {book:'Book detail', login:'Login & registration', checkout:'Checkout', library:'My Library', reader:'Reader', admin:'Administration', 'not-found':'Page not found'};
export default function AppRouter() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const update=()=>setPath(window.location.pathname); window.addEventListener('popstate',update); return ()=>window.removeEventListener('popstate',update); }, []);
  const route=resolveRoute(path);
  if(route.name==='home') return <Storefront/>;
  return <main className="placeholder-page"><div className="placeholder-content"><p className="placeholder-kicker">HASAN EBOOK MARKET · PHASE 1</p><h1>{labels[route.name]}</h1><p>{route.name==='not-found'?'This address is not part of the library.':'This area is planned for a later phase and is not functional yet.'}</p><a href="/">← Return to the 3D library</a></div></main>;
}
