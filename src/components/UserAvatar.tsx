import React, { useState } from "react";
import { cn } from "../lib/utils";

interface UserAvatarProps {
  photoURL?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  username?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl font-bold",
  xl: "w-20 h-20 text-3xl font-bold",
  "2xl": "w-24 h-24 text-4xl font-bold",
};

export default function UserAvatar({
  photoURL,
  avatarUrl,
  name,
  username,
  size = "md",
  className,
  showBorder = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = photoURL || avatarUrl;

  const initial = (name?.trim() || username?.trim() || "W")
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white font-bold select-none shadow-sm",
        sizeClasses[size],
        showBorder && "ring-2 ring-indigo-500/30 dark:ring-indigo-400/30",
        className
      )}
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={name || username || "User avatar"}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
