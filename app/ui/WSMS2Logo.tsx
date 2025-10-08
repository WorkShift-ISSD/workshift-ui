import Image from "next/image";

interface WSMS2LogoProps {
    className?: string;
}

export default function WSMS2Logo({ className }: WSMS2LogoProps) {
    return (
    <div className={`relative ${className}`}>
        <Image
        src="/LogoWSv4.png"
        alt="Logo de WorkShift"
        fill
        className="object-contain rounded-lg"
        priority
        />
    </div>
    );
}