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

  if (!isAuthorized) return null; // evita parpadeos antes de validar

  return (
    <div className="flex min-h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow p-6 md:overflow-y-auto md:p-12">{children}</div>
      
    </div>
  );
}
