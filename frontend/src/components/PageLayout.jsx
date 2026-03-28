import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { EyeOff } from 'lucide-react';

/**
 * Shared layout for all admin module pages.
 */
const PageLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const societyName = user.society_name || 'My Society';
  const isImpersonating = user.impersonated_by_master === true;

  const handleReturnToMaster = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/master-admin');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isImpersonating && (
        <div className="fixed top-0 left-0 w-full bg-amber-500 text-amber-950 font-bold px-4 py-2 flex items-center justify-between z-[9999] shadow-md border-b-2 border-amber-600">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">⚠️</span>
            You are currently impersonating <span className="underline">{societyName}</span> as <span className="underline">{user.email}</span>.
          </div>
          <button 
            onClick={handleReturnToMaster}
            className="flex items-center gap-1.5 bg-amber-950 text-white px-3 py-1 rounded-md text-sm shadow-sm hover:bg-amber-800 transition-colors"
          >
            <EyeOff className="w-4 h-4" />
            Return to Master Admin
          </button>
        </div>
      )}
      
      <div className={isImpersonating ? "mt-10 min-h-screen w-full flex" : "w-full flex"}>
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0">
          <Topbar societyName={societyName} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
