import React from 'react';
import { Outlet } from 'react-router-dom';
// import Sidebar from '../layout/Sidebar';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* 1. Fixed Sidebar */}
      {/* <Sidebar /> */}

      {/* 2. Scrollable Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* You can add a TopBar/Header here later if needed */}

        <div className="flex-1 overflow-y-auto">
          {/* This renders the component matched by the current route */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
