import WSMS2Logo from "@/app/ui/WSMS2Logo";

export default function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <WSMS2Logo className="mb-10" />
      <div className="flex items-center justify-center align-center h-15 shrink-0 rounded-lg p-4 md:h-20">
              <div className="flex items-center justify-center mt- gap-x-0">
                            
                            <WSMS2Logo className="h-20 w-20 ml-3" />

                          </div>
            </div>
      <div className="spinner">
        <div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
  );
}
