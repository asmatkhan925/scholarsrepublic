"use client";

import { useParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import {
  applyAdminDetectedDeadline,
  checkAdminOpportunityDuplicates,
  getAdminOpportunity,
  getAdminOpportunityPathways,
  patchAdminOpportunity,
  prepareAdminDeadlineVerification,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AdminOpportunityDuplicateMatch,
  DeadlineVerificationPackage,
  OpportunityAdminPayload,
  OpportunityDetail,
  OpportunityPathwayDetail,
} from "@/types/opportunity";

import { emptyForm, type ScholarshipEditForm } from "./types";
import { buildForm, getPublishReadiness, getStipendWarnings, textToList } from "./utils";

export function useScholarshipEdit() {
  const params = useParams<{ id: string }>();
  const opportunityId = Number(params.id);

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [pathways, setPathways] = useState<OpportunityPathwayDetail[]>([]);
  const [form, setForm] = useState<ScholarshipEditForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminOpportunityDuplicateMatch[]>([]);
  const [deadlinePackage, setDeadlinePackage] = useState<DeadlineVerificationPackage | null>(null);
  const [deadlineChecking, setDeadlineChecking] = useState(false);
  const [deadlineApplying, setDeadlineApplying] = useState(false);
  const [deadlineMessage, setDeadlineMessage] = useState("");
  const [deadlineError, setDeadlineError] = useState("");

  const publicHref = useMemo(() => {
    if (!opportunity || opportunity.status !== "published") {
      return null;
    }

    return `/scholarships/${opportunity.slug}`;
  }, [opportunity]);
  const publishReadiness = useMemo(() => getPublishReadiness(form), [form]);
  const stipendWarnings = useMemo(() => getStipendWarnings(form), [form]);

  function updateField<K extends keyof ScholarshipEditForm>(
    field: K,
    value: ScholarshipEditForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function loadOpportunity() {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminOpportunity(opportunityId);
      setOpportunity(data);
      setForm(buildForm(data));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadPathways() {
    try {
      const response = await getAdminOpportunityPathways({
        active: true,
        page_size: 300,
      });
      setPathways(response.results);
    } catch {
      setPathways([]);
    }
  }

  async function handlePrepareDeadlineCheck() {
    setDeadlineChecking(true);
    setDeadlineMessage("");
    setDeadlineError("");
    try {
      const data = await prepareAdminDeadlineVerification(opportunityId);
      setDeadlinePackage(data);
      setDeadlineMessage("Deadline verification package prepared.");
    } catch (requestError) {
      setDeadlineError(getErrorMessage(requestError) ?? "Deadline verification failed.");
    } finally {
      setDeadlineChecking(false);
    }
  }

  async function handleApplyDetectedDeadline(dateValue: string, evidence = "", sourceUrl = "") {
    setDeadlineApplying(true);
    setDeadlineMessage("");
    setDeadlineError("");
    try {
      await applyAdminDetectedDeadline(opportunityId, {
        detected_deadline: dateValue,
        evidence_text: evidence,
        source_url: sourceUrl,
      });
      const refreshed = await getAdminOpportunity(opportunityId);
      setOpportunity(refreshed);
      setForm(buildForm(refreshed));
      setDeadlineMessage(
        "Detected deadline applied. Social caption refreshed and uploaded image marked stale.",
      );
    } catch (requestError) {
      setDeadlineError(getErrorMessage(requestError) ?? "Could not apply detected deadline.");
    } finally {
      setDeadlineApplying(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(opportunityId) || opportunityId <= 0) {
      setError("Invalid scholarship id.");
      setLoading(false);
      return;
    }

    void loadOpportunity();
    void loadPathways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  useEffect(() => {
    let mounted = true;

    async function checkDuplicates() {
      if (!form.title.trim() && !form.official_link.trim() && !form.source_url.trim()) {
        setDuplicateMatches([]);
        return;
      }

      try {
        const response = await checkAdminOpportunityDuplicates({
          title: form.title.trim(),
          slug: opportunity?.slug,
          official_link: form.official_link.trim(),
          source_url: form.source_url.trim(),
          provider_name: form.provider_name.trim(),
          university_name: form.university_name.trim(),
          country: form.country.trim(),
          deadline: form.deadline,
          degree_levels: textToList(form.degree_levels),
          pathway_id: form.pathway_id,
          exclude_id: opportunityId,
        });

        if (mounted) {
          setDuplicateMatches(response.matches);
        }
      } catch {
        if (mounted) {
          setDuplicateMatches([]);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void checkDuplicates();
    }, 500);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [
    form.country,
    form.deadline,
    form.degree_levels,
    form.official_link,
    form.pathway_id,
    form.provider_name,
    form.source_url,
    form.title,
    form.university_name,
    opportunity?.slug,
    opportunityId,
  ]);

  async function handleSave() {
    if (
      duplicateMatches.some((match) => match.confidence === "exact") &&
      !window.confirm(
        "An exact duplicate was found. Save anyway only if you are intentionally updating this record.",
      )
    ) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    const payload: Partial<OpportunityAdminPayload> = {
      opportunity_type: "scholarship",
      title: form.title.trim(),
      provider_name: form.provider_name.trim(),
      university_name: form.university_name.trim(),
      country: form.country.trim(),
      pathway_id: form.pathway_id,
      status: form.status,
      featured: form.featured,
      verified_status: form.verified_status,
      verification_note: form.verification_note.trim(),
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      benefits: form.benefits.trim(),
      eligibility: form.eligibility.trim(),
      how_to_apply: form.how_to_apply.trim(),
      official_link: form.official_link.trim(),
      source_url: form.source_url.trim(),
      source_name: form.source_name.trim(),
      deadline: form.is_rolling_deadline || !form.deadline ? null : form.deadline,
      is_rolling_deadline: form.is_rolling_deadline,
      funding_type: form.funding_type,
      funding_amount: form.funding_amount.trim() || null,
      funding_currency: form.funding_currency.trim(),
      stipend_summary: form.stipend_summary.trim(),
      degree_levels: textToList(form.degree_levels),
      fields_of_study: textToList(form.fields_of_study),
      eligible_countries: textToList(form.eligible_countries),
      required_documents: textToList(form.required_documents),
      tags: textToList(form.tags),
      application_fee_required: form.application_fee_required,
      ielts_required: form.ielts_required,
      toefl_required: form.toefl_required,
      duolingo_required: form.duolingo_required,
      hsk_required: form.hsk_required,
      english_proficiency_certificate_accepted: form.english_proficiency_certificate_accepted,
    };

    try {
      await patchAdminOpportunity(opportunityId, payload);
      const refreshed = await getAdminOpportunity(opportunityId);
      setOpportunity(refreshed);
      setForm(buildForm(refreshed));
      setSaved(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return {
    opportunity,
    pathways,
    form,
    updateField,
    loading,
    saving,
    saved,
    error,
    duplicateMatches,
    deadlinePackage,
    deadlineChecking,
    deadlineApplying,
    deadlineMessage,
    deadlineError,
    publicHref,
    publishReadiness,
    stipendWarnings,
    opportunityId,
    handleSave,
    handlePrepareDeadlineCheck,
    handleApplyDetectedDeadline,
  };
}
