"use client";

export function LoadingSpinner({ size = "default", padding }: { size?: "xs" | "small" | "default" | "large", padding?: string }) {
  const sizeClasses = {
    xs: "scale-[0.25]",   // arbitrary value, sí es válido
    small: "scale-50",
    default: "scale-100",
    large: "scale-150"
  };

  const paddingClasses = {
    xs: "p-1",
    small: "p-2",
    default: "p-8",
    large: "p-10"
  };

  // xs y small usan scale, que achica visualmente pero no en el layout.
  // El clip wrapper limita el espacio real al tamaño visual del spinner.
  const clipSize: Record<string, string> = { xs: 'w-[15px] h-[15px]', small: 'w-[30px] h-[30px]' };
  const needsClip = size === 'xs' || size === 'small';

  const spinnerEl = (
    <div className={`spinner ${sizeClasses[size]}`}>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
      <div className="bg-blue-600 dark:bg-blue-400"></div>
    </div>
  );

  return (
    <div className={`flex items-center justify-center ${padding ?? paddingClasses[size]}`}>
      {needsClip ? (
        <div className={`${clipSize[size]} overflow-hidden flex items-center justify-center`}>
          {spinnerEl}
        </div>
      ) : spinnerEl}
    </div>
  );
}