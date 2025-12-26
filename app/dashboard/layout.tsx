"use client";

import SideNav from "../ui/dashboard/sidenav";
import ProtectedRoute from "../components/ProtectedRoute";
import WhatsAppChatbot from "../components/asistentes virtuales/WhatsAppChatbot";
import AsistenteIA from "../components/asistentes virtuales/AsistenteIA";
import Footer from "../components/Footer"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
        <div className="w-full flex-none md:w-64 bg-white dark:bg-gray-800 transition-colors">
          <SideNav />
        </div>
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto scrollbar-hide">
          <div className="flex-1 p-6 md:p-12">
            {children}
          </div>
          <Footer /> 
        </div>
        <WhatsAppChatbot />
        <AsistenteIA />
      </div>
    </ProtectedRoute>
  );
}
