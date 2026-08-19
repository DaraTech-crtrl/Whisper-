import React, { useState, useEffect } from "react";
import { ExternalLink, Globe, Sparkles } from "lucide-react";
import { LinkPreviewData, fetchLinkPreview, getDomainFromUrl, getGoogleFaviconUrl } from "../lib/linkPreview";
import { cn } from "../lib/utils";

interface LinkPreviewCardProps {
  key?: React.Key;
  url: string;
  initialData?: LinkPreviewData;
  variant?: "default" | "cinematic" | "compact";
  className?: string;
}

export default function LinkPreviewCard({
  url,
  initialData,
  variant = "default",
  className,
}: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [faviconError, setFaviconError] = useState(false);

  const domain = getDomainFromUrl(url);

  useEffect(() => {
    let isMounted = true;

    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFaviconError(false);

    fetchLinkPreview(url)
      .then((preview) => {
        if (isMounted) {
          setData(preview);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData({
            url,
            title: domain,
            domain,
            favicon: getGoogleFaviconUrl(domain),
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, initialData, domain]);

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const faviconSrc = data?.favicon || getGoogleFaviconUrl(domain);

  // Cinematic variant (for Full-screen Modal display)
  if (variant === "cinematic") {
    if (loading) {
      return (
        <div
          className={cn(
            "w-full rounded-2xl bg-white/5 border border-white/15 p-3.5 flex items-center gap-3 animate-pulse text-left",
            className
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-4 bg-white/15 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenLink}
        className={cn(
          "group/preview relative overflow-hidden rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/15 hover:border-indigo-400/40 p-3.5 transition-all duration-200 shadow-lg text-left cursor-pointer flex items-center justify-between gap-3.5 active:scale-[0.99]",
          className
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Favicon / Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover/preview:scale-105 transition-transform shadow-inner">
            {!faviconError ? (
              <img
                src={faviconSrc}
                alt={`${domain} icon`}
                className="w-full h-full object-contain rounded-md"
                onError={() => setFaviconError(true)}
                loading="lazy"
              />
            ) : (
              <Globe className="w-5 h-5 text-indigo-400" />
            )}
          </div>

          {/* Title & Domain */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1 group-hover/preview:text-indigo-300 transition-colors">
              {data?.title || domain}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-300/80 font-medium">
              <span className="truncate">{data?.domain || domain}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-500" />
              <span className="text-[11px] text-indigo-300 font-semibold group-hover/preview:underline flex items-center gap-0.5">
                Visit Link
              </span>
            </div>
          </div>
        </div>

        {/* External Link Action Badge */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 group-hover/preview:bg-indigo-500 text-white flex items-center justify-center transition-all border border-white/15 group-hover/preview:border-indigo-400 shadow-sm">
          <ExternalLink className="w-4 h-4 group-hover/preview:scale-110 transition-transform" />
        </div>
      </div>
    );
  }

  // Compact variant (for dense list preview)
  if (variant === "compact") {
    if (loading) {
      return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse text-xs", className)}>
          <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="w-24 h-3 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleOpenLink}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-2xs group text-left",
          className
        )}
        title={data?.title || url}
      >
        <div className="w-4 h-4 rounded shrink-0 overflow-hidden flex items-center justify-center">
          {!faviconError ? (
            <img
              src={faviconSrc}
              alt=""
              className="w-full h-full object-contain"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
        <span className="truncate max-w-[200px]">{data?.title || domain}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>
    );
  }

  // Default variant (Standard dashboard card)
  if (loading) {
    return (
      <div
        className={cn(
          "w-full rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-3 flex items-center gap-3 animate-pulse text-left",
          className
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-2.5 bg-slate-200/70 dark:bg-slate-700/60 rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenLink}
      className={cn(
        "group/preview relative overflow-hidden rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-indigo-400/60 dark:hover:border-indigo-500/50 p-3 transition-all duration-200 shadow-2xs hover:shadow-md text-left cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Favicon */}
        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover/preview:scale-105 transition-transform shadow-2xs">
          {!faviconError ? (
            <img
              src={faviconSrc}
              alt={`${domain} icon`}
              className="w-full h-full object-contain rounded-sm"
              onError={() => setFaviconError(true)}
              loading="lazy"
            />
          ) : (
            <Globe className="w-4 h-4 text-indigo-500" />
          )}
        </div>

        {/* Title & Domain */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1 group-hover/preview:text-indigo-600 dark:group-hover/preview:text-indigo-400 transition-colors">
            {data?.title || domain}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="truncate">{data?.domain || domain}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover/preview:underline flex items-center gap-0.5">
              Open link
            </span>
          </div>
        </div>
      </div>

      {/* External Link Icon */}
      <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 group-hover/preview:bg-indigo-600 group-hover/preview:text-white text-slate-400 dark:text-slate-300 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-600 group-hover/preview:border-indigo-600 shadow-2xs">
        <ExternalLink className="w-3.5 h-3.5 group-hover/preview:scale-110 transition-transform" />
      </div>
    </div>
  );
}
