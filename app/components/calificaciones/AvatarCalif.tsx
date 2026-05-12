export function AvatarCalif({ iniciales, size = "md" }: { iniciales: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center font-medium flex-shrink-0`}>
      {iniciales}
    </div>
  );
}
