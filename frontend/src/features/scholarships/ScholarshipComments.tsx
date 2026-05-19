"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Reply, Send, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import {
  createScholarshipComment,
  deleteScholarshipComment,
  getScholarshipComments,
  replyToScholarshipComment,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ScholarshipComment, ScholarshipCommentReply } from "@/types/opportunity";

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function CommentBody({ body, isDeleted }: { body: string; isDeleted: boolean }) {
  if (isDeleted) {
    return (
      <p className="text-xs italic text-ink/45 dark:text-white/45">
        This comment was deleted.
      </p>
    );
  }

  return (
    <p className="whitespace-pre-line text-sm leading-5 text-ink/70 dark:text-white/62">
      {body}
    </p>
  );
}

function ReplyItem({
  reply,
  onDelete,
}: {
  reply: ScholarshipCommentReply;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-bold text-ink dark:text-white">{reply.user_name}</p>
          <Badge tone="neutral">{reply.user_role}</Badge>
          <span className="text-[11px] text-ink/45 dark:text-white/45">
            {formatCommentDate(reply.created_at)}
          </span>
        </div>

        {reply.can_delete && !reply.is_deleted ? (
          <button
            type="button"
            onClick={() => onDelete(reply.id)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/45 transition hover:text-red-700 dark:text-white/45 dark:hover:text-red-300"
          >
            <Trash2 size={12} aria-hidden="true" />
            Delete
          </button>
        ) : null}
      </div>

      <div className="mt-1.5">
        <CommentBody body={reply.body} isDeleted={reply.is_deleted} />
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  slug,
  onRefresh,
}: {
  comment: ScholarshipComment;
  slug: string;
  onRefresh: () => Promise<void>;
}) {
  const { isAuthenticated } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReplySubmit() {
    if (!replyBody.trim()) {
      return;
    }

    setSubmittingReply(true);
    setError(null);

    try {
      await replyToScholarshipComment(slug, comment.id, { body: replyBody });
      setReplyBody("");
      setReplying(false);
      await onRefresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    setError(null);

    try {
      await deleteScholarshipComment(id);
      await onRefresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-bold text-ink dark:text-white">{comment.user_name}</p>
          <Badge tone="neutral">{comment.user_role}</Badge>
          <span className="text-[11px] text-ink/45 dark:text-white/45">
            {formatCommentDate(comment.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && !comment.is_deleted ? (
            <button
              type="button"
              onClick={() => setReplying((current) => !current)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-pine transition hover:text-ink dark:hover:text-white"
            >
              <Reply size={13} aria-hidden="true" />
              Reply
            </button>
          ) : null}

          {comment.can_delete && !comment.is_deleted ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => handleDelete(comment.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink/45 transition hover:text-red-700 disabled:opacity-50 dark:text-white/45 dark:hover:text-red-300"
            >
              <Trash2 size={13} aria-hidden="true" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5">
        <CommentBody body={comment.body} isDeleted={comment.is_deleted} />
      </div>

      {replying ? (
        <div className="mt-2 grid gap-1.5">
          <textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write a helpful reply..."
            className="w-full rounded-xl border border-pine/15 bg-white px-2.5 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
          />
          <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => setReplying(false)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submittingReply || !replyBody.trim()}
              onClick={handleReplySubmit}
              size="sm"
            >
              <Send size={13} aria-hidden="true" />
              {submittingReply ? "Posting..." : "Post Reply"}
            </Button>
          </div>
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="mt-2 grid gap-1.5 border-l-2 border-pine/10 pl-2.5 dark:border-white/10">
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} onDelete={handleDelete} />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </article>
  );
}

export function ScholarshipComments({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<ScholarshipComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadComments() {
    setError(null);

    try {
      const response = await getScholarshipComments(slug);
      setComments(response.results);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleSubmit() {
    if (!body.trim()) {
      return;
    }

    setPosting(true);
    setError(null);
    setNotice(null);

    try {
      await createScholarshipComment(slug, { body });
      setBody("");
      setNotice("Submitted for review. It will appear after approval.");
      await loadComments();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPosting(false);
    }
  }

  return (
    <Card className="dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pine">
              Student discussion
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
              Questions and updates
            </h2>
          </div>

          <Badge tone="sky">
            {comments.length === 1 ? "1 approved" : `${comments.length} approved`}
          </Badge>
        </div>

        <p className="mt-1.5 text-xs leading-5 text-ink/55 dark:text-white/50">
          Ask practical questions. Comments are reviewed before publication.
        </p>

        {isAuthenticated ? (
          <div className="mt-3 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Ask about eligibility, deadline, documents, or application steps..."
              className="w-full rounded-xl border border-pine/15 bg-white px-2.5 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
            />
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-4 text-ink/45 dark:text-white/45">
                Do not share phone, CNIC, passwords, or private documents.
              </p>
              <Button
                type="button"
                disabled={posting || !body.trim()}
                onClick={handleSubmit}
                size="sm"
              >
                <Send size={13} aria-hidden="true" />
                {posting ? "Submitting..." : "Ask"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-pine/10 bg-[#f7faf8] p-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-pine dark:bg-white/5">
                  <MessageCircle size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">Want to ask?</p>
                  <p className="text-xs leading-5 text-ink/55 dark:text-white/50">
                    Log in to ask or reply.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <ButtonLink href="/login" size="sm" variant="outline">
                  Log in
                </ButtonLink>
                <ButtonLink href="/register" size="sm" variant="secondary">
                  Create Profile
                </ButtonLink>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="mt-3 text-sm text-ink/65 dark:text-white/58">Loading comments...</p>
        ) : null}

        {notice ? (
          <div className="mt-3 rounded-xl border border-pine/20 bg-mint/40 p-2.5 text-sm font-medium text-pine dark:border-pine/20 dark:bg-pine/10">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm font-medium text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && comments.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-pine/20 bg-white p-3 text-sm leading-5 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/58">
            <p className="font-bold text-ink dark:text-white">No approved questions yet.</p>
            <p className="mt-0.5">Be the first to ask. New comments appear after review.</p>
          </div>
        ) : null}

        {!loading && !error && comments.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                slug={slug}
                onRefresh={loadComments}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
