"use client";

export function LoadingSpinner({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "scale-50",
    default: "scale-100",
    large: "scale-150"
  };

  return (
    <div className="flex items-center justify-center p-8">
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