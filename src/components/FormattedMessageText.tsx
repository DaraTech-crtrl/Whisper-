import React from "react";
import { extractUrls } from "../lib/linkPreview";
import LinkPreviewCard from "./LinkPreviewCard";
import { cn } from "../lib/utils";

interface FormattedMessageTextProps {
  text: string;
  mood?: string;
  variant?: "default" | "cinematic" | "compact";
  showPreviewCard?: boolean;
  maxPreviews?: number;
  className?: string;
  textClassName?: string;
  previewClassName?: string;
}

export default function FormattedMessageText({
  text,
  mood,
  variant = "default",
  showPreviewCard = true,
  maxPreviews = 2,
  className,
  textClassName,
  previewClassName,
}: FormattedMessageTextProps) {
  if (!text) return null;

  const urls = extractUrls(text);
  const previewUrls = urls.slice(0, maxPreviews);

  // Split text to make URLs clickable inside paragraphs
  const renderTextWithLinks = () => {
    if (urls.length === 0) {
      return (
        <span>
          {mood && <span className="mr-2 text-xl inline-block align-middle">{mood}</span>}
          {text}
        </span>
      );
    }

    // Replace URLs with clickable anchors
    // Create token regex
    const urlPattern = /(https?:\/\/[^\s<>"'{}|\\^`]+)/gi;
    const parts = text.split(urlPattern);

    return (
      <span>
        {mood && <span className="mr-2 text-xl inline-block align-middle">{mood}</span>}
        {parts.map((part, index) => {
          if (part.match(urlPattern)) {
            // Clean trailing punctuation
            const cleanUrl = part.replace(/[.,;:!?)>"'\]]+$/, "");
            const trailing = part.slice(cleanUrl.length);

            return (
              <React.Fragment key={index}>
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "underline underline-offset-2 break-all transition-colors",
                    variant === "cinematic"
                      ? "text-indigo-300 hover:text-indigo-100 font-semibold"
                      : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
                  )}
                >
                  {cleanUrl}
                </a>
                {trailing}
              </React.Fragment>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className={cn("w-full flex flex-col", className)}>
      <div className={cn("break-words", textClassName)}>
        {renderTextWithLinks()}
      </div>

      {showPreviewCard && previewUrls.length > 0 && (
        <div className={cn("mt-3.5 space-y-2.5 w-full", previewClassName)}>
          {previewUrls.map((url) => (
            <LinkPreviewCard
              key={url}
              url={url}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}
