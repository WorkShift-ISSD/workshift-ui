import Image from "next/image";

export default function AcmeLogo() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative w-[80%] h-[80px] md:h-[120px]">
        <Image
          src="/LogoWSv4.png"
          alt="WorkShift Logo"
          fill
          className="object-contain rounded-lg"
          priority
        />
      </div>
    </div>
  );
}