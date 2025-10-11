import Image from "next/image";

interface WSMSLogoProps {
    className?: string;
}

export default function MigraLogo({ className }: WSMSLogoProps) {
  return (
    <div className={`relative ${className}`}>
        <Image
          src="/logo migra.png"
          alt="Migraciones Logo"
          fill
          className="object-contain rounded-lg dark:invert dark:brightness-0 dark:contrast-200"
          priority
        />
    </div>
  );
}