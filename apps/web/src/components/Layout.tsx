import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        {!isHomePage && <Sidebar />}
        
        <main className={`flex-1 ${!isHomePage ? 'ml-64' : ''} p-6`}>
          {children}
        </main>
      </div>
    </div>
  );
}
