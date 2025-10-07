import WSMSLogo from "@/app/ui/WSMSLogo";

export default function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <WSMSLogo className="mb-10" />
      <div className="spinner">
        <div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
  );
}
