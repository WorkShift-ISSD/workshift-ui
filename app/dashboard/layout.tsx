"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SideNav from "../ui/dashboard/sidenav";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    } else {
      setIsAuthorized(true);

      const tokenBackup = localStorage.getItem("token");
      localStorage.clear();
      if (tokenBackup) {
        localStorage.setItem("token", tokenBackup);
      }
    }
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
      <div className="w-full flex-none md:w-64 bg-white dark:bg-gray-800 transition-colors overflow-y-auto scrollbar-hide">
        <SideNav />
      </div>
      <div className="flex-grow p-6 md:p-12 bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}