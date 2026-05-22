"use client";

import { useMemo, useState } from "react";

import { Check, ClipboardCopy, Copy, Eye, Link2, MessageCircle, Send, Share2 } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import {
  buildFacebookPost,
  buildLinkedInPost,
  buildShareUrls,
  buildWhatsAppMessage,
} from "@/lib/social/scholarshipShare";
import { cn } from "@/lib/cn";
import type { OpportunityDetail } from "@/types/opportunity";

type ScholarshipSocialShareCardProps = {
  scholarship: OpportunityDetail;
  slug: string;
};

type CopyAction = "link" | "facebook" | "whatsapp" | "linkedin";

const shareLinkClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-2 text-xs font-semibold text-ink shadow-sm transition hover:border-pine/30 hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10";

function copyWithFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ScholarshipSocialShareCard({ scholarship, slug }: ScholarshipSocialShareCardProps) {
  const [copiedAction, setCopiedAction] = useState<CopyAction | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const shareUrls = useMemo(() => buildShareUrls(scholarship, slug), [scholarship, slug]);
  const copyText = useMemo(
    () => ({
      link: shareUrls.copyUrl,
      facebook: buildFacebookPost(scholarship, slug),
      whatsapp: buildWhatsAppMessage(scholarship, slug),
      linkedin: buildLinkedInPost(scholarship, slug),
    }),
    [scholarship, shareUrls.copyUrl, slug],
  );

  async function handleCopy(action: CopyAction) {
    setCopyFailed(false);

    try {
      await copyWithFallback(copyText[action]);
      setCopiedAction(action);
      window.setTimeout(() => {
        setCopiedAction((current) => (current === action ? null : current));
      }, 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  const copyButtonLabel = (action: CopyAction, label: string) =>
    copiedAction === action ? "Copied" : label;

  return (
    <Card
      className="dark:border-white/10 dark:bg-[#181b1d]"
      data-testid="scholarship-social-share-card"
    >
      <CardContent className="p-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
            Social sharing
          </p>
          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/55">
            Share this scholarship or copy a ready-made post.
          </p>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
            Share link
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <a
              href={shareUrls.facebook}
              target="_blank"
              rel="noreferrer"
              className={shareLinkClass}
            >
              <Share2 size={14} aria-hidden="true" />
              Facebook
            </a>
            <a
              href={shareUrls.whatsapp}
              target="_blank"
              rel="noreferrer"
              className={shareLinkClass}
            >
              <MessageCircle size={14} aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={shareUrls.linkedin}
              target="_blank"
              rel="noreferrer"
              className={shareLinkClass}
            >
              <Link2 size={14} aria-hidden="true" />
              LinkedIn
            </a>
            <a
              href={shareUrls.telegram}
              target="_blank"
              rel="noreferrer"
              className={shareLinkClass}
            >
              <Send size={14} aria-hidden="true" />
              Telegram
            </a>
            <a
              href={shareUrls.x}
              target="_blank"
              rel="noreferrer"
              className={cn(shareLinkClass, "col-span-2")}
            >
              <Share2 size={14} aria-hidden="true" />X
            </a>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35 dark:text-white/35">
            Copy
          </p>
          <div className="mt-1.5 grid gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 justify-start rounded-xl px-2 text-[11px]"
              onClick={() => void handleCopy("link")}
            >
              {copiedAction === "link" ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              {copyButtonLabel("link", "Copy link")}
            </Button>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start rounded-xl px-2 text-[11px]"
                onClick={() => void handleCopy("facebook")}
              >
                {copiedAction === "facebook" ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={14} aria-hidden="true" />
                )}
                {copyButtonLabel("facebook", "Copy Facebook post")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start rounded-xl px-2 text-[11px]"
                onClick={() => void handleCopy("whatsapp")}
              >
                {copiedAction === "whatsapp" ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={14} aria-hidden="true" />
                )}
                {copyButtonLabel("whatsapp", "Copy WhatsApp message")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start rounded-xl px-2 text-[11px]"
                onClick={() => void handleCopy("linkedin")}
              >
                {copiedAction === "linkedin" ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <ClipboardCopy size={14} aria-hidden="true" />
                )}
                {copyButtonLabel("linkedin", "Copy LinkedIn post")}
              </Button>
            </div>
          </div>
          {copyFailed ? (
            <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-300">
              Copy failed. Select and copy from your browser manually.
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <a
            href={shareUrls.ogImageUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(shareLinkClass, "h-9 w-full")}
          >
            <Eye size={14} aria-hidden="true" />
            Preview social image
          </a>
          <p className="mt-2 text-xs leading-5 text-ink/50 dark:text-white/45">
            Social previews use the scholarship title, deadline, funding, and dynamic image.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
