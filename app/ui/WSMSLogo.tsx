import Image from "next/image";

interface WSMSLogoProps {
    className?: string;
}

export default function WSMSLogo({ className }: WSMSLogoProps) {
    return (
    <div className={`relative ${className}`}>
        <Image
        src="/LogoWSv4-2.png"
        alt="Logo de WorkShift"
        fill
        className="object-contain rounded-lg"
        priority
        />
    </div>
    );
}