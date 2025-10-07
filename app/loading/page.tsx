import WSMS2Logo from "@/app/ui/WSMS2Logo";

export default function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      {/* Logo centrado */}
      <WSMS2Logo className="h-60 w-60 mb-10" />

      {/* Spinner debajo del logo */}
      <div className="spinner mt-8">
        <div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
  );
}

