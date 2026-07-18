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

  return (
    <div className={`flex items-center justify-center ${padding ?? paddingClasses[size]}`}>
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
    </div>
  );
}