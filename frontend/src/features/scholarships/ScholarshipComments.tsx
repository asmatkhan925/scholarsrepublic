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
    return <p className="text-sm italic text-ink/45">This comment was deleted.</p>;
  }

  return <p className="whitespace-pre-line text-sm leading-6 text-ink/70">{body}</p>;
}

function ReplyItem({
  reply,
  onDelete,
}: {
  reply: ScholarshipCommentReply;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-pine/10 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-ink">{reply.user_name}</p>
          <Badge tone="neutral">{reply.user_role}</Badge>
          <span className="text-xs text-ink/45">{formatCommentDate(reply.created_at)}</span>
        </div>

        {reply.can_delete && !reply.is_deleted ? (
          <button
            type="button"
            onClick={() => onDelete(reply.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink/45 transition hover:text-red-700"
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
        ) : null}
      </div>

      <div className="mt-2">
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
    <div className="rounded-3xl border border-pine/10 bg-[#f7faf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-ink">{comment.user_name}</p>
          <Badge tone="neutral">{comment.user_role}</Badge>
          <span className="text-xs text-ink/45">{formatCommentDate(comment.created_at)}</span>
        </div>

        {comment.can_delete && !comment.is_deleted ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => handleDelete(comment.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink/45 transition hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden="true" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <CommentBody body={comment.body} isDeleted={comment.is_deleted} />
      </div>

      {isAuthenticated && !comment.is_deleted ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setReplying((current) => !current)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-pine transition hover:text-ink"
          >
            <Reply size={14} aria-hidden="true" />
            Reply
          </button>
        </div>
      ) : null}

      {replying ? (
        <div className="mt-3 grid gap-2">
          <textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a helpful reply..."
            className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => setReplying(false)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submittingReply || !replyBody.trim()}
              onClick={handleReplySubmit}
              size="sm"
            >
              <Send size={14} aria-hidden="true" />
              {submittingReply ? "Posting..." : "Post Reply"}
            </Button>
          </div>
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="mt-4 grid gap-2 border-l-2 border-pine/10 pl-3">
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} onDelete={handleDelete} />
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

export function ScholarshipComments({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<ScholarshipComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      await createScholarshipComment(slug, { body });
      setBody("");
      await loadComments();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPosting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pine">
              Student discussion
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">Comments and questions</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Ask practical questions, share application updates, or help other students understand
              this scholarship.
            </p>
          </div>

          <Badge tone="sky">{comments.length} comments</Badge>
        </div>

        {isAuthenticated ? (
          <div className="mt-5 rounded-3xl border border-pine/10 bg-[#f7faf8] p-4">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Write a comment or question for other students..."
              className="w-full rounded-2xl border border-pine/15 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink/45">
                Be helpful. Avoid sharing private documents or personal contact details.
              </p>
              <Button
                type="button"
                disabled={posting || !body.trim()}
                onClick={handleSubmit}
                size="sm"
              >
                <Send size={14} aria-hidden="true" />
                {posting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-pine/10 bg-mint/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-pine">
                  <MessageCircle size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-ink">Login to join the discussion</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Students can ask questions and reply after creating a free profile.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonLink href="/login" size="sm" variant="outline">
                  Login
                </ButtonLink>
                <ButtonLink href="/register" size="sm" variant="secondary">
                  Create Profile
                </ButtonLink>
              </div>
            </div>
          </div>
        )}

        {loading ? <p className="mt-5 text-sm text-ink/65">Loading comments...</p> : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && comments.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-pine/20 bg-white p-5 text-sm leading-6 text-ink/65">
            No comments yet. Be the first student to ask a useful question about this scholarship.
          </div>
        ) : null}

        {!loading && !error && comments.length > 0 ? (
          <div className="mt-5 grid gap-3">
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
