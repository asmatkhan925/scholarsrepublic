"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  ExternalLink,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminHero, AdminLoading, AdminMetric, AdminNotice } from "@/components/admin/AdminUI";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import {
  createAdminOpportunityPathway,
  deactivateAdminOpportunityPathway,
  getAdminOpportunityPathways,
  getCountries,
  reactivateAdminOpportunityPathway,
  updateAdminOpportunityPathway,
  type AdminOpportunityPathwayPayload,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { CountryOption } from "@/types/reference";
import type { OpportunityPathwayDetail } from "@/types/opportunity";

type StatusFilter = "all" | "active" | "inactive";

type PathwayForm = {
  title: string;
  pathway_type: string;
  country_id: string;
  parent_id: string;
  description: string;
  official_link: string;
  display_order: string;
  is_active: boolean;
};

const pathwayTypeOptions = [
  "country_hub",
  "government_program",
  "scholarship_program",
  "application_track",
  "university_group",
  "professor_lab_group",
  "regional_scholarship",
  "university_scholarship",
  "guide",
  "other",
];

const emptyForm: PathwayForm = {
  title: "",
  pathway_type: "other",
  country_id: "",
  parent_id: "",
  description: "",
  official_link: "",
  display_order: "100",
  is_active: true,
};

function humanize(value: string) {
  if (!value) {
    return "Not specified";
  }

  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "pathway";
}

function buildForm(pathway: OpportunityPathwayDetail): PathwayForm {
  return {
    title: pathway.title,
    pathway_type: pathway.pathway_type || "other",
    country_id: pathway.country_id ? String(pathway.country_id) : "",
    parent_id: pathway.parent_id ? String(pathway.parent_id) : "",
    description: pathway.description || "",
    official_link: pathway.official_link || "",
    display_order: String(pathway.display_order ?? 100),
    is_active: pathway.is_active,
  };
}

function getDepth(pathway: OpportunityPathwayDetail) {
  return Math.max((pathway.full_path || pathway.title).split(" > ").length - 1, 0);
}

function getDescendantIds(pathwayId: number, pathways: OpportunityPathwayDetail[]) {
  const descendants = new Set<number>();
  let changed = true;

  while (changed) {
    changed = false;

    pathways.forEach((pathway) => {
      if (
        pathway.parent_id &&
        (pathway.parent_id === pathwayId || descendants.has(pathway.parent_id)) &&
        !descendants.has(pathway.id)
      ) {
        descendants.add(pathway.id);
        changed = true;
      }
    });
  }

  return descendants;
}

function hasCircularParent(
  editingId: number | null,
  parentId: number | null,
  pathways: OpportunityPathwayDetail[],
) {
  if (!editingId || !parentId) {
    return false;
  }

  const byId = new Map(pathways.map((pathway) => [pathway.id, pathway]));
  const seen = new Set<number>();
  let currentId: number | null = parentId;

  while (currentId) {
    if (currentId === editingId || seen.has(currentId)) {
      return true;
    }

    seen.add(currentId);
    currentId = byId.get(currentId)?.parent_id ?? null;
  }

  return false;
}

function buildPayload(form: PathwayForm, editing: OpportunityPathwayDetail | null) {
  const displayOrder = Number.parseInt(form.display_order, 10);
  const payload: AdminOpportunityPathwayPayload = {
    title: form.title.trim(),
    pathway_type: form.pathway_type,
    country_id: form.country_id ? Number(form.country_id) : null,
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    description: form.description.trim(),
    official_link: form.official_link.trim(),
    display_order: Number.isFinite(displayOrder) && displayOrder >= 0 ? displayOrder : 100,
    is_active: form.is_active,
  };

  if (!editing) {
    payload.slug = slugify(form.title);
  }

  return payload;
}

function PathwayStatusBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="mint">Active</Badge> : <Badge tone="danger">Inactive</Badge>;
}

function PathwayManagerContent() {
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<OpportunityPathwayDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PathwayForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rootOnly, setRootOnly] = useState(false);

  const sortedPathways = useMemo(() => {
    return [...pathways].sort((first, second) => {
      const firstRoot = first.full_path.split(" > ")[0] || first.title;
      const secondRoot = second.full_path.split(" > ")[0] || second.title;
      const rootCompare = firstRoot.localeCompare(secondRoot);

      if (rootCompare !== 0) {
        return rootCompare;
      }

      return first.full_path.localeCompare(second.full_path);
    });
  }, [pathways]);

  const filteredPathways = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortedPathways.filter((pathway) => {
      const matchesSearch =
        !normalizedSearch ||
        pathway.title.toLowerCase().includes(normalizedSearch) ||
        pathway.slug.toLowerCase().includes(normalizedSearch) ||
        pathway.full_path.toLowerCase().includes(normalizedSearch);

      const matchesType = typeFilter === "all" || pathway.pathway_type === typeFilter;
      const matchesCountry =
        countryFilter === "all" || String(pathway.country_id ?? "") === countryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? pathway.is_active : !pathway.is_active);
      const matchesRoot = !rootOnly || pathway.parent_id === null;

      return matchesSearch && matchesType && matchesCountry && matchesStatus && matchesRoot;
    });
  }, [countryFilter, rootOnly, search, sortedPathways, statusFilter, typeFilter]);

  const parentOptions = useMemo(() => {
    const blockedIds = editing ? getDescendantIds(editing.id, pathways) : new Set<number>();

    return sortedPathways.filter((pathway) => {
      return pathway.id !== editing?.id && !blockedIds.has(pathway.id);
    });
  }, [editing, pathways, sortedPathways]);

  const usedCountries = useMemo(() => {
    const byId = new Map<number, string>();

    pathways.forEach((pathway) => {
      if (pathway.country_id && pathway.country) {
        byId.set(pathway.country_id, pathway.country);
      }
    });

    return Array.from(byId, ([id, name]) => ({ id, name })).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [pathways]);

  const stats = useMemo(() => {
    return {
      total: pathways.length,
      active: pathways.filter((pathway) => pathway.is_active).length,
      root: pathways.filter((pathway) => pathway.parent_id === null).length,
      inactive: pathways.filter((pathway) => !pathway.is_active).length,
    };
  }, [pathways]);

  async function loadPathways() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOpportunityPathways({ page_size: 500 });
      setPathways(response.results);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const response = await getCountries();
      setCountries(response.results);
    } catch {
      setCountries([]);
    }
  }

  useEffect(() => {
    void loadPathways();
    void loadCountries();
  }, []);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setSuccess(null);
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(pathway: OpportunityPathwayDetail) {
    setEditing(pathway);
    setForm(buildForm(pathway));
    setSuccess(null);
    setError(null);
    setFormOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCountryFilter("all");
    setStatusFilter("all");
    setRootOnly(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    const parentId = form.parent_id ? Number(form.parent_id) : null;
    if (hasCircularParent(editing?.id ?? null, parentId, pathways)) {
      setError("A pathway cannot use itself or one of its descendants as a parent.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form, editing);
      if (editing) {
        await updateAdminOpportunityPathway(editing.id, payload);
      } else {
        await createAdminOpportunityPathway(payload);
      }

      setSuccess(editing ? "Pathway updated." : "Pathway created.");
      setEditing(null);
      setForm(emptyForm);
      setFormOpen(false);
      await loadPathways();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(pathway: OpportunityPathwayDetail) {
    const confirmed = window.confirm(
      `Deactivate "${pathway.title}"? Scholarships using this pathway will keep their assignment, but the pathway will be hidden from public browsing.`,
    );

    if (!confirmed) {
      return;
    }

    setActionId(pathway.id);
    setError(null);
    setSuccess(null);

    try {
      await deactivateAdminOpportunityPathway(pathway.id);
      setPathways((current) =>
        current.map((item) => (item.id === pathway.id ? { ...item, is_active: false } : item)),
      );
      setSuccess("Pathway deactivated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  }

  async function handleReactivate(pathway: OpportunityPathwayDetail) {
    setActionId(pathway.id);
    setError(null);
    setSuccess(null);

    try {
      const updated = await reactivateAdminOpportunityPathway(pathway.id);
      setPathways((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Pathway reactivated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  }

  return (
    <DashboardShell
      mode="admin"
      title="Scholarship Pathways"
      description="Manage scholarship pathway categories."
      hideHeader
    >
      <div className="space-y-4">
        <AdminHero
          eyebrow="Scholarship operations"
          title="Scholarship pathways"
          description="Manage pathway categories used for scholarship browsing and admin classification."
          backHref="/dashboard/admin/scholarships"
          backLabel="Back to scholarship manager"
          icon={FolderTree}
          actions={
            <>
              <Button type="button" size="sm" onClick={openCreateForm}>
                <Plus size={15} aria-hidden="true" />
                New pathway
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadPathways()}>
                <RefreshCw size={15} aria-hidden="true" />
                Refresh
              </Button>
            </>
          }
          metrics={
            <>
              <AdminMetric label="Total" value={stats.total} />
              <AdminMetric label="Active" value={stats.active} tone="success" />
              <AdminMetric label="Root" value={stats.root} tone="info" />
              <AdminMetric
                label="Inactive"
                value={stats.inactive}
                tone={stats.inactive > 0 ? "warning" : "normal"}
              />
            </>
          }
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        {success ? <AdminNotice tone="info">{success}</AdminNotice> : null}

        {formOpen ? (
          <section className="rounded-[1.5rem] border border-pine/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
            <div className="flex flex-col gap-2 border-b border-pine/10 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-ink dark:text-white">
                  {editing ? "Edit pathway" : "New pathway"}
                </h2>
                <p className="text-sm text-ink/55 dark:text-white/50">
                  {editing ? editing.full_path : "Create a pathway for scholarship browsing."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                  setForm(emptyForm);
                }}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:col-span-2">
                  Title
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                    placeholder="China scholarships"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Pathway type
                  <select
                    value={form.pathway_type}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, pathway_type: event.target.value }))
                    }
                    className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                  >
                    {pathwayTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {humanize(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Display order
                  <input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, display_order: event.target.value }))
                    }
                    className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:col-span-2">
                  Parent pathway
                  <select
                    value={form.parent_id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, parent_id: event.target.value }))
                    }
                    className="h-10 w-full min-w-0 truncate rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                  >
                    <option value="">Root pathway</option>
                    {parentOptions.map((pathway) => (
                      <option key={pathway.id} value={pathway.id}>
                        {pathway.full_path}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Country
                  <select
                    value={form.country_id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, country_id: event.target.value }))
                    }
                    className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                  >
                    <option value="">No country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-pine/10 bg-[#f7faf8] px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_active: event.target.checked }))
                    }
                    className="h-4 w-4 accent-pine"
                  />
                  Active
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
                  Official link
                  <input
                    value={form.official_link}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, official_link: event.target.value }))
                    }
                    className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                    placeholder="https://..."
                  />
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:row-span-2">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={4}
                    className="w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                    placeholder="Short internal/public description..."
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                  {editing ? "Save changes" : "Create pathway"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setFormOpen(false);
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-[1.5rem] border border-pine/10 bg-white shadow-soft dark:border-white/10 dark:bg-[#181b1d]">
          <div className="grid grid-cols-1 gap-3 border-b border-pine/10 bg-[#f7faf8] p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-2 xl:grid-cols-6">
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white md:col-span-2">
              Search
              <div className="relative min-w-0">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/35"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
                  placeholder="Title, slug, or full path..."
                />
              </div>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All types</option>
                {pathwayTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Country
              <select
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All countries</option>
                {usedCountries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink dark:text-white">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 w-full min-w-0 rounded-xl border border-pine/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row md:col-span-2 xl:col-span-1 xl:flex-col">
              <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-pine/10 bg-white px-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-[#101214] dark:text-white">
                <input
                  type="checkbox"
                  checked={rootOnly}
                  onChange={(event) => setRootOnly(event.target.checked)}
                  className="h-4 w-4 accent-pine"
                />
                Root only
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>

          {loading ? <AdminLoading label="Loading pathways..." /> : null}

          {!loading && filteredPathways.length === 0 ? (
            <div className="p-4">
              <EmptyState
                action={
                  <Button type="button" onClick={openCreateForm}>
                    <Plus size={16} aria-hidden="true" />
                    New pathway
                  </Button>
                }
                description="No pathways matched the selected filters."
                icon={<FolderTree size={22} aria-hidden="true" />}
                title="No pathways found"
              />
            </div>
          ) : null}

          {!loading && filteredPathways.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[64rem] text-left">
                  <thead className="bg-white text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45 dark:bg-white/5 dark:text-white/40">
                    <tr>
                      <th className="px-3 py-2">Pathway</th>
                      <th className="px-3 py-2">Parent</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Published</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPathways.map((pathway) => {
                      const depth = getDepth(pathway);
                      const isRoot = depth === 0;
                      const busy = actionId === pathway.id;

                      return (
                        <tr
                          key={pathway.id}
                          className="border-t border-pine/10 align-top transition hover:bg-mint/20 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          <td className="min-w-[18rem] px-3 py-3">
                            <div style={{ paddingLeft: `${Math.min(depth, 4) * 1.25}rem` }}>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isRoot ? <Badge tone="pine">Root</Badge> : <Badge tone="sky">Child</Badge>}
                                <span className="font-black text-ink dark:text-white">
                                  {pathway.title}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/45">
                                {pathway.slug}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs text-ink/55 dark:text-white/50">
                                {pathway.full_path}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-ink/65 dark:text-white/58">
                            {pathway.parent || "None"}
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone="neutral">{humanize(pathway.pathway_type)}</Badge>
                          </td>
                          <td className="px-3 py-3 text-sm text-ink/65 dark:text-white/58">
                            {pathway.country || "None"}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-ink dark:text-white">
                            {pathway.display_order}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-ink dark:text-white">
                            {pathway.published_opportunity_count ?? 0}
                          </td>
                          <td className="px-3 py-3">
                            <PathwayStatusBadge active={pathway.is_active} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-[15rem] flex-wrap gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditForm(pathway)}
                              >
                                <Pencil size={14} aria-hidden="true" />
                                Edit
                              </Button>
                              {pathway.is_active ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void handleDeactivate(pathway)}
                                >
                                  {busy ? (
                                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                  ) : (
                                    <XCircle size={14} aria-hidden="true" />
                                  )}
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void handleReactivate(pathway)}
                                >
                                  {busy ? (
                                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                  ) : (
                                    <CheckCircle2 size={14} aria-hidden="true" />
                                  )}
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredPathways.map((pathway) => {
                  const busy = actionId === pathway.id;
                  const depth = getDepth(pathway);

                  return (
                    <Card key={pathway.id} className="dark:border-white/10 dark:bg-[#181b1d]">
                      <CardContent className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {depth === 0 ? <Badge tone="pine">Root</Badge> : <Badge tone="sky">Child</Badge>}
                          <PathwayStatusBadge active={pathway.is_active} />
                          <Badge tone="neutral">{humanize(pathway.pathway_type)}</Badge>
                        </div>
                        <h2 className="mt-2 text-base font-black text-ink dark:text-white">
                          {pathway.title}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                          {pathway.slug}
                        </p>
                        <p className="mt-2 text-sm leading-5 text-ink/65 dark:text-white/58">
                          {pathway.full_path}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/60 dark:text-white/55">
                          <span className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                            Parent: {pathway.parent || "None"}
                          </span>
                          <span className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                            Country: {pathway.country || "None"}
                          </span>
                          <span className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                            Order: {pathway.display_order}
                          </span>
                          <span className="rounded-xl border border-pine/10 bg-[#f7faf8] px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                            Published: {pathway.published_opportunity_count ?? 0}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(pathway)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </Button>
                          {pathway.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handleDeactivate(pathway)}
                            >
                              <XCircle size={14} aria-hidden="true" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handleReactivate(pathway)}
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/admin/scholarships" size="sm" variant="outline">
            Back to scholarships
          </ButtonLink>
          <ButtonLink href="/scholarships" size="sm" variant="ghost">
            Public scholarships
            <ExternalLink size={14} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AdminPathwayManagerPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PathwayManagerContent />
    </ProtectedRoute>
  );
}
