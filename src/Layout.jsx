import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2
};

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    // Load Hebrew Google Fonts
    if (!document.getElementById('google-fonts-hebrew')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-hebrew';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&family=Heebo:wght@400;600;700&family=Assistant:wght@400;600;700&family=Secular+One&family=Varela+Round&family=Frank+Ruhl+Libre:wght@400;700&family=Amatic+SC:wght@400;700&family=Suez+One&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    // Ensure proper viewport for mobile
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
    }

    // Handle install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
  }, []);

  return (
    <div 
      className="app-container min-h-screen bg-[#1d1022]" 
      dir="rtl"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        overscrollBehavior: 'none'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPageName}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}