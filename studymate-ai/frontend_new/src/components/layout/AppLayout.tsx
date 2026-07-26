// components/layout/AppLayout.tsx — Main layout with sidebar + content area

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Animated3DBackground = lazy(() => import('../ui/Animated3DBackground'));

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0A0514] relative overflow-hidden">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Animated3DBackground />
      </Suspense>

      {/* Radial vignette overlay for depth & text clarity */}
      <div className="absolute inset-0 pointer-events-none z-[1]"
           style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(5,2,10,0.95) 100%)' }} />
      
      {/* Sidebar and content */}
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
