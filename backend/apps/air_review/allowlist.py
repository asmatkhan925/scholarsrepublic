"""Allowlist and content-type policy for the AIR_review public API.

This is the security boundary. The API will *only* ever serve files whose
relative path appears in ``ALLOWLIST`` **and** that exist inside the generated
snapshot directory. Nothing else on the filesystem is reachable.

Keep this list in sync with
``scripts/generate_air_api_snapshot.py`` in the AIR_review repository.
"""

# Exact relative paths that may be served. No globs, no wildcards.
ALLOWLIST = frozenset(
    {
        "README.md",
        "LATEST_REPO_STATE.md",
        "repo_manifest.json",
        "00_project_management/decision_log.md",
        "01_scope_and_planning/research_questions.md",
        "01_scope_and_planning/review_methodology.md",
        "02_literature_search/search_log.csv",
        "03_references/citation_verification_log.csv",
        "03_references/references.bib",
        "05_synthesis_matrices/seed_paper_map.csv",
        "05_synthesis_matrices/dataset_benchmark_matrix.csv",
        "05_synthesis_matrices/foundation_model_matrix.csv",
        "05_synthesis_matrices/data_centric_strategy_matrix.csv",
        "05_synthesis_matrices/adaptation_strategy_matrix.csv",
        "05_synthesis_matrices/pseudo_labeling_kd_matrix.csv",
        "05_synthesis_matrices/evaluation_robustness_matrix.csv",
        "05_synthesis_matrices/evidence_to_claim_matrix.csv",
        "06_review_outline/section_argument_map.md",
        "07_draft_sections/01_introduction.md",
        "12_manuscript/main_manuscript.md",
    }
)


def content_type_for(rel_path: str) -> str:
    lower = rel_path.lower()
    if lower.endswith(".csv"):
        return "text/csv; charset=utf-8"
    if lower.endswith(".json"):
        return "application/json; charset=utf-8"
    # .md, .bib, .txt and everything else allowlisted is served as plain text.
    return "text/plain; charset=utf-8"
