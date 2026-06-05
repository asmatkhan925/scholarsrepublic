export { api, setAuthToken, clearAuthToken } from "./client";
export type { PaginationParams, PendingRequest } from "./client";

export type { HealthResponse } from "./reference";
export { getHealth, getCountries, getStudyFields } from "./reference";

export {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  confirmPasswordReset,
  getCurrentUser,
  logoutUser,
} from "./auth";

export {
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  patchStudentProfile,
  getProfileCompletion,
} from "./profile";

export type {
  ScholarshipPickerQueryParams,
  ScholarshipPickerItem,
  ScholarshipPickerResponse,
} from "./opportunities";
export {
  getOpportunities,
  getOpportunity,
  getOpportunityPathways,
  getOpportunityPathway,
  getScholarships,
  getScholarshipPicker,
  getScholarship,
  getOpportunityMatch,
  getScholarshipMatch,
  getRecommendedOpportunities,
  getRecommendedScholarships,
  getSavedOpportunities,
  createSavedOpportunity,
  deleteSavedOpportunity,
  getSavedOpportunitySlugs,
  saveOpportunityBySlug,
  unsaveOpportunityBySlug,
  saveScholarshipBySlug,
  unsaveScholarshipBySlug,
} from "./opportunities";

export {
  getApplications,
  createApplication,
  getApplication,
  patchApplication,
  deleteApplication,
  getApplicationSummary,
  startApplicationFromSaved,
  startApplicationByOpportunitySlug,
  startApplicationByScholarshipSlug,
} from "./applications";

export {
  getScholarshipComments,
  createScholarshipComment,
  replyToScholarshipComment,
  deleteScholarshipComment,
} from "./comments";

export {
  submitSOPJob,
  getAIJobStatus,
  getSOPDrafts,
  getSOPDraft,
  createSOPDraft,
  patchSOPDraft,
  deleteSOPDraft,
} from "./ai";

export type {
  AdminOverviewResponse,
  AdminOpportunityPathwayPayload,
  AdminOpportunityDraftQueryParams,
  AdminCommentQueryParams,
} from "./admin/opportunities";
export {
  getAdminOverview,
  getAdminOpportunities,
  getAdminOpportunity,
  checkAdminOpportunityDuplicates,
  createAdminOpportunity,
  updateAdminOpportunity,
  patchAdminOpportunity,
  deleteAdminOpportunity,
  getAdminOpportunityDrafts,
  getAdminOpportunityDraft,
  createAdminOpportunityDraft,
  patchAdminOpportunityDraft,
  validateAdminOpportunityDraft,
  importAdminOpportunityDraft,
  deleteAdminOpportunityDraft,
  getAdminOpportunityPathways,
  createAdminOpportunityPathway,
  updateAdminOpportunityPathway,
  deactivateAdminOpportunityPathway,
  reactivateAdminOpportunityPathway,
  getAdminOpportunityComments,
  moderateAdminOpportunityComment,
} from "./admin/opportunities";

export type {
  SocialImageUploadResponse,
  SocialSchedulerStatusResponse,
  AdminOpportunitySocialPlan,
  AdminCollectionSocialPlan,
  AdminSocialPlanListResponse,
  AdminSocialPlanQuery,
  AdminSocialLogQuery,
  AdminSocialLogItem,
  AdminSocialLogListResponse,
} from "./admin/social";
export {
  getSocialSchedulerStatus,
  getAdminSocialLogs,
  getAdminOpportunitySocialPlans,
  saveAdminOpportunitySocialPlanCaption,
  getAdminCollectionSocialPlans,
  saveAdminCollectionSocialPlanCaption,
  uploadAdminDraftSocialImage,
  uploadAdminOpportunitySocialImage,
  saveAdminDraftSocialPostReview,
  saveAdminOpportunitySocialPostReview,
  postScholarshipToFacebookNow,
  scheduleScholarshipFacebookPost,
  prepareAdminDeadlineVerification,
  getAdminDeadlineVerificationQueue,
  runAdminDeadlineVerificationAction,
  applyAdminDetectedDeadline,
  getAdminScholarshipResearchLeads,
  updateAdminScholarshipResearchLeadStatus,
} from "./admin/social";

export type {
  AdminSocialReelSourceOpportunity,
  AdminSocialReelPlan,
  AdminSocialReelPlanPayload,
  AdminSocialReelPlanListResponse,
  AdminSocialReelPlanQuery,
  AdminSocialReelGeneratePreview,
  AdminSocialReelGenerateResponse,
} from "./admin/reels";
export {
  getAdminSocialReelPlans,
  createAdminSocialReelPlan,
  getAdminSocialReelPlan,
  generateAdminSocialReelPlans,
  renderAdminSocialReelPlan,
} from "./admin/reels";
