import Image from "next/image";

interface WSMSLogoProps {
    className?: string;
}

export default function MigraLogo({ className }: WSMSLogoProps) {
  return (
    <>
      {/* Logo completo - Solo visible en desktop */}
      <div className={`hidden md:block relative ${className}`}>
        <Image
          src="/logo migra.png"
          alt="Migraciones Logo"
          fill
          className="object-contain rounded-lg dark:invert dark:brightness-0 dark:contrast-200"
          priority
        />
      </div>

      {/* Icono pequeño - Solo visible en móvil */}
      <div className={`block md:hidden relative ${className}`}>
        <Image
          src="/icon migra.png"
          alt="Migraciones Icon"
          fill
          className="object-contain rounded-lg dark:invert dark:brightness-0 dark:contrast-200"
          priority
        />
      </div>
    </>
  );
}