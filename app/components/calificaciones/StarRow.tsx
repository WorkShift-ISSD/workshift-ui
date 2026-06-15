"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function StarRow({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={`transition-colors ${onChange ? "cursor-pointer" : ""} ${
            i <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-gray-600"
          }`}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </div>
  );
}
