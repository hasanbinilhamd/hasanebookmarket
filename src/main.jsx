import React from 'react';
import {createRoot} from 'react-dom/client';
import AppRouter from './routing/AppRouter';
import './style.css';

createRoot(document.getElementById('root')).render(<AppRouter/>);
