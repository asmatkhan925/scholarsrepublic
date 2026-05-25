"use client";

import { useMemo, useState } from "react";

import { ImageUp, Loader2 } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import type { SocialImageState } from "@/types/opportunity";

type SocialImageUploadCardProps = {
  initialImage: SocialImageState | null;
  onUpload: (image: File, imagePrompt?: string) => Promise<SocialImageState>;
};

const acceptedImageTypes = "image/png,image/jpeg,image/webp";

export function SocialImageUploadCard({ initialImage, onUpload }: SocialImageUploadCardProps) {
  const [socialImage, setSocialImage] = useState<SocialImageState | null>(initialImage);
  const [imagePrompt, setImagePrompt] = useState(initialImage?.image_prompt ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imageLabel = useMemo(() => {
    if (!socialImage?.image_status) return "No saved image yet";
    return `${socialImage.image_status.replaceAll("_", " ")}${
      socialImage.image_source ? ` from ${socialImage.image_source.replaceAll("_", " ")}` : ""
    }`;
  }, [socialImage]);

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a PNG, JPG, or WebP image first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const uploaded = await onUpload(selectedFile, imagePrompt);
      setSocialImage(uploaded);
      setSelectedFile(null);
      setMessage("Social image uploaded.");
    } catch (uploadError) {
      setError(getErrorMessage(uploadError) ?? "Social image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="grid gap-3 p-3 md:p-4">
        <div className="flex items-center gap-2">
          <ImageUp size={17} className="text-pine" aria-hidden="true" />
          <h2 className="text-lg font-bold text-ink dark:text-white">Facebook/Social Image</h2>
        </div>

        <p className="text-xs leading-5 text-ink/60 dark:text-white/50">
          Download the GPT-generated image, then upload it here.
        </p>

        {socialImage?.image_url ? (
          <div className="grid gap-2">
            <img
              src={socialImage.image_url}
              alt="Saved Facebook social preview"
              className="aspect-[4/5] w-full rounded-xl border border-pine/10 object-cover dark:border-white/10"
            />
            <a
              href={socialImage.image_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs font-semibold text-pine hover:text-pine/80"
            >
              {socialImage.image_url}
            </a>
          </div>
        ) : null}

        <div className="rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-xs font-semibold text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
          {imageLabel}
          {socialImage?.image_error ? (
            <div className="mt-1 text-red-700 dark:text-red-300">{socialImage.image_error}</div>
          ) : null}
        </div>

        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Image file
          <input
            type="file"
            accept={acceptedImageTypes}
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-pine file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
          Image prompt
          <textarea
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
            rows={3}
            className="rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
            placeholder="Optional prompt used to generate this image"
          />
        </label>

        {message ? (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-sm font-semibold text-pine dark:border-pine/20 dark:bg-pine/10">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <Button type="button" onClick={() => void handleUpload()} disabled={uploading}>
          {uploading ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp size={15} aria-hidden="true" />
          )}
          {uploading ? "Uploading..." : "Upload image"}
        </Button>
      </CardContent>
    </Card>
  );
}
