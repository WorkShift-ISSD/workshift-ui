"use client";


import SideNav from "../ui/dashboard/sidenav";
import ProtectedRoute from "../components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // <SessionProvider>
      <ProtectedRoute>
        <div className="flex h-screen flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
          <div className="w-full flex-none md:w-64 bg-white dark:bg-gray-800 transition-colors overflow-y-auto scrollbar-hide">
            <SideNav />
          </div>
          <div className="flex-grow p-6 md:p-12 bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto scrollbar-hide">
            {children}
          </div>
        </div>
      </ProtectedRoute>
    // </SessionProvider>
  );
}
