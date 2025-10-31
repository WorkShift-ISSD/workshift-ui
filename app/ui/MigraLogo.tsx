import Image from "next/image";

interface WSMSLogoProps {
    className?: string;
     iconOnly?: boolean;
}

export default function MigraLogo({ className, iconOnly = false}: WSMSLogoProps) {
  // Si iconOnly es true, mostrar solo el icono
  if (iconOnly){
    return (
      <div className={`relative ${className}`}>
        <Image
          src="/icon migra.png"
          alt="Migraciones Icono"
          fill
          className="object-contain rounded-lg dark:invert dark:brightness-0 dark:contrast-200"
          priority
        />
      </div>
    );
  }
  
  // Por defecto, mostrar el logo completo
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