"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  deleteScholarshipComment,
  getAdminOpportunityComments,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AdminOpportunityComment } from "@/types/opportunity";

type StatusFilter = "all" | "active" | "deleted";
type TypeFilter = "all" | "top_level" | "reply";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCommentPreview(comment: AdminOpportunityComment) {
  if (comment.is_deleted && !comment.body) {
    return "This comment has already been deleted.";
  }

  return comment.body || "No comment body.";
}

function CommentModerationCard({
  comment,
  deletingId,
  onDelete,
}: {
  comment: AdminOpportunityComment;
  deletingId: number | null;
  onDelete: (comment: AdminOpportunityComment) => Promise<void>;
}) {
  const deleting = deletingId === comment.id;
  const isReply = comment.parent_id !== null;

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#181b1d]">
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={comment.is_deleted ? "danger" : "mint"}>
                {comment.is_deleted ? "Deleted" : "Active"}
              </Badge>
              <Badge tone={isReply ? "sky" : "neutral"}>{isReply ? "Reply" : "Top-level"}</Badge>
              {comment.replies_count > 0 ? (
                <Badge tone="saffron">{comment.replies_count} replies</Badge>
              ) : null}
            </div>

            <h2 className="mt-2 text-base font-bold leading-snug text-ink dark:text-white md:text-lg">
              {comment.opportunity_title}
            </h2>

            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
              {comment.user_name} · {comment.user_email} · {formatDate(comment.created_at)}
            </p>

            <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm leading-6 text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
              {getCommentPreview(comment)}
            </p>
          </div>

          <aside className="border-t border-pine/10 bg-white p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
            <div className="grid gap-2">
              <Link
                href={`/scholarships/${comment.opportunity_slug}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/15 bg-white px-3 text-xs font-bold text-pine transition hover:bg-mint dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <ExternalLink size={14} aria-hidden="true" />
                View scholarship
              </Link>

              {!comment.is_deleted ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => void onDelete(comment)}
                  className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                  Delete
                </Button>
              ) : (
                <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 text-xs font-bold text-ink/45 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                  <Undo2 size={14} aria-hidden="true" />
                  Already deleted
                </span>
              )}
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminCommentsContent() {
  const [comments, setComments] = useState<AdminOpportunityComment[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadComments() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOpportunityComments({
        page_size: 100,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      setComments(response.results);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      total: comments.length,
      active: comments.filter((comment) => !comment.is_deleted).length,
      deleted: comments.filter((comment) => comment.is_deleted).length,
      replies: comments.filter((comment) => comment.parent_id !== null).length,
    }),
    [comments],
  );

  async function handleDelete(comment: AdminOpportunityComment) {
    if (!window.confirm("Delete this comment from the public scholarship discussion?")) {
      return;
    }

    setDeletingId(comment.id);
    setMessage(null);
    setError(null);

    try {
      await deleteScholarshipComment(comment.id);
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                body: "",
                is_deleted: true,
              }
            : item,
        ),
      );
      setMessage("Comment deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Comment Moderation"
      description="Review and delete inappropriate scholarship comments."
      hideHeader
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-pine/10 bg-white shadow-soft transition-colors dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid gap-0 bg-gradient-to-r from-mint/75 via-white to-skyglass transition-colors dark:from-pine/10 dark:via-[#181b1d] dark:to-skyglass/20 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="px-4 py-4 md:px-5">
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pine transition hover:text-pine/80"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to admin workbench
              </Link>

              <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-baseline xl:gap-3">
                <h1 className="shrink-0 text-2xl font-black tracking-tight text-ink dark:text-white md:text-3xl">
                  Comment moderation
                </h1>

                <p className="max-w-none text-sm leading-6 text-ink/65 dark:text-white/60 xl:truncate xl:whitespace-nowrap">
                  Review scholarship discussions and remove inappropriate comments.
                </p>
              </div>
            </div>

            <div className="border-t border-pine/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Loaded
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Active
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.active}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-400/25 dark:bg-red-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-red-700/60 dark:text-red-300/70">
                    Deleted
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-red-700 dark:text-red-300">
                    {stats.deleted}
                  </p>
                </div>
                <div className="rounded-xl border border-pine/10 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">
                    Replies
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-ink dark:text-white">
                    {stats.replies}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-t border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_11rem_11rem_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Search
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void loadComments();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white dark:placeholder:text-white/35"
                  placeholder="Search body, scholarship, user..."
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                className="h-10 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All</option>
                <option value="top_level">Top-level</option>
                <option value="reply">Replies</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void loadComments()}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

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

        {loading ? (
          <Card className="dark:border-white/10 dark:bg-[#181b1d]">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-ink/70 dark:text-white/60">
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Loading comments...
            </CardContent>
          </Card>
        ) : null}

        {!loading && comments.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/dashboard/admin">
                Back to Workbench
                <ArrowLeft size={16} aria-hidden="true" />
              </ButtonLink>
            }
            description="No comments matched the selected filters."
            icon={<MessageSquare size={22} aria-hidden="true" />}
            title="No comments found"
          />
        ) : null}

        {!loading && comments.length > 0 ? (
          <section className="grid gap-3">
            {comments.map((comment) => (
              <CommentModerationCard
                key={comment.id}
                comment={comment}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            ))}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminCommentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminCommentsContent />
    </ProtectedRoute>
  );
}
