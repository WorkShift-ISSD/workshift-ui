import Image from "next/image";

interface WSMSLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function WSMSLogo({ className, iconOnly = false }: WSMSLogoProps) {
  if (iconOnly) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src="/wsms-cubo.png"
          alt="WSMS Icono"
          fill
          className="object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      <div className="relative h-full aspect-[286/483]">
        <Image
          src="/wsms-cubo.png"
          alt="WSMS Cubo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="relative h-full flex-1">
        <Image
          src="/wsms-texto-dark.png"
          alt="Work Shift Management Systems"
          fill
          className="object-contain dark:hidden"
          priority
        />
        <Image
          src="/wsms-texto-light.png"
          alt="Work Shift Management Systems"
          fill
          className="object-contain hidden dark:block"
          priority
        />
      </div>
    </div>
  );
}