import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1">
        {/* 모바일 오버레이 */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
            onClick={closeSidebar}
          />
        )}
        
        {/* 사이드바: 모바일에서는 오버레이, 데스크탑에서는 고정 */}
        {!isHomePage && (
          <div className={`
            fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
            lg:relative lg:translate-x-0 lg:z-auto
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <Sidebar onItemClick={closeSidebar} />
          </div>
        )}
        
        <main className={`flex-1 ${!isHomePage ? 'lg:ml-64' : ''} p-4 sm:p-6`}>
          {children}
        </main>
      </div>
    </div>
  );
}
