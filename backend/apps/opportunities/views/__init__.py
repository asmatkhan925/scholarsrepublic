"""
Public package re-exporting all view names that urls.py depends on.
"""

# Public & student-facing
from .public import (
    PublicOpportunityPathwayListView,
    PublicOpportunityPathwayDetailView,
    PublicOpportunityListView,
    PublicOpportunityDetailView,
    PublicScholarshipListView,
    PublicScholarshipDetailView,
    PublicScholarshipCollectionDetailView,
    OpportunityMatchView,
    ScholarshipMatchView,
    RecommendedOpportunitiesView,
    RecommendedScholarshipsView,
    ScholarshipPickerView,
    ScholarshipCommentThrottle,
    ScholarshipCommentListCreateView,
    ScholarshipCommentReplyCreateView,
    OpportunityCommentDeleteView,
)

# Admin CRUD
from .admin_core import (
    AdminOpportunityListCreateView,
    AdminOpportunityDetailView,
    AdminOpportunityPathwayListCreateView,
    AdminOpportunityPathwayDetailView,
    AdminOpportunityDraftListCreateView,
    AdminOpportunityDraftDetailView,
    AdminOpportunityDraftValidateView,
    AdminOpportunityDraftImportView,
    AdminOpportunityDuplicateCheckView,
    AdminOpportunityCommentListView,
    AdminOpportunityCommentModerateView,
    AdminOverviewView,
)

# Agent draft creation, research leads, social images
from .agent_core import (
    AgentDebugAuthView,
    AgentScholarshipValidateView,
    AgentScholarshipCreateDraftView,
    AgentScholarshipSocialDraftView,
    AgentScholarshipDraftSocialImageView,
    AgentScholarshipOpportunitySocialImageView,
    AdminScholarshipDraftSocialImageUploadView,
    AdminScholarshipSocialImageUploadView,
    AgentScholarshipResearchDuplicateView,
    AgentScholarshipResearchLeadCreateView,
    AgentScholarshipResearchLeadListView,
    AgentScholarshipResearchLeadMarkImportedView,
    AdminScholarshipResearchLeadListView,
    AdminScholarshipResearchLeadActionView,
)

# Deadline verification
from .deadline import (
    AgentScholarshipDeadlineVerificationPackageView,
    AgentScholarshipDeadlineVerificationQueueView,
    AgentScholarshipDeadlineVerificationBatchPackageView,
    AgentScholarshipDeadlineVerificationResultView,
    AgentScholarshipSourceLinkCorrectionView,
    AgentScholarshipDeadlineCheckQueueView,
    AgentScholarshipDeadlineCheckResultView,
    AdminScholarshipDeadlineVerificationPackageView,
    AdminScholarshipDeadlineVerificationQueueView,
    AdminScholarshipDeadlineVerificationActionView,
    AdminScholarshipDeadlineApplyView,
    build_deadline_verification_queue,
)

# Social posting, scheduling, Facebook, plans, logs
from .social import (
    AdminScholarshipDraftSocialPostReviewView,
    AdminScholarshipSocialPostReviewView,
    AdminScholarshipFacebookPostNowView,
    AdminScholarshipFacebookScheduleView,
    AgentFacebookDuePostsView,
    AgentFacebookPostResultView,
    AdminSocialOpportunityPlanListView,
    AdminSocialOpportunityPlanCaptionView,
    AdminSocialCollectionPlanListView,
    AdminSocialCollectionPlanCaptionView,
    AdminSocialLogListView,
    AdminSocialSchedulerStatusView,
)

# Reels (also includes AgentFacebook reel views)
from .reels import (
    AdminSocialReelPlanListCreateView,
    AdminSocialReelPlanDetailView,
    AdminSocialReelPlanGenerateView,
    AdminSocialReelPlanRenderView,
    AgentFacebookDueReelsView,
    AgentFacebookReelPostedView,
    AgentFacebookReelFailedView,
)

__all__ = [
    # public
    "PublicOpportunityPathwayListView",
    "PublicOpportunityPathwayDetailView",
    "PublicOpportunityListView",
    "PublicOpportunityDetailView",
    "PublicScholarshipListView",
    "PublicScholarshipDetailView",
    "PublicScholarshipCollectionDetailView",
    "OpportunityMatchView",
    "ScholarshipMatchView",
    "RecommendedOpportunitiesView",
    "RecommendedScholarshipsView",
    "ScholarshipPickerView",
    "ScholarshipCommentThrottle",
    "ScholarshipCommentListCreateView",
    "ScholarshipCommentReplyCreateView",
    "OpportunityCommentDeleteView",
    # admin_core
    "AdminOpportunityListCreateView",
    "AdminOpportunityDetailView",
    "AdminOpportunityPathwayListCreateView",
    "AdminOpportunityPathwayDetailView",
    "AdminOpportunityDraftListCreateView",
    "AdminOpportunityDraftDetailView",
    "AdminOpportunityDraftValidateView",
    "AdminOpportunityDraftImportView",
    "AdminOpportunityDuplicateCheckView",
    "AdminOpportunityCommentListView",
    "AdminOpportunityCommentModerateView",
    "AdminOverviewView",
    # agent_core
    "AgentDebugAuthView",
    "AgentScholarshipValidateView",
    "AgentScholarshipCreateDraftView",
    "AgentScholarshipSocialDraftView",
    "AgentScholarshipDraftSocialImageView",
    "AgentScholarshipOpportunitySocialImageView",
    "AdminScholarshipDraftSocialImageUploadView",
    "AdminScholarshipSocialImageUploadView",
    "AgentScholarshipResearchDuplicateView",
    "AgentScholarshipResearchLeadCreateView",
    "AgentScholarshipResearchLeadListView",
    "AgentScholarshipResearchLeadMarkImportedView",
    "AdminScholarshipResearchLeadListView",
    "AdminScholarshipResearchLeadActionView",
    # deadline
    "AgentScholarshipDeadlineVerificationPackageView",
    "AgentScholarshipDeadlineVerificationQueueView",
    "AgentScholarshipDeadlineVerificationBatchPackageView",
    "AgentScholarshipDeadlineVerificationResultView",
    "AgentScholarshipSourceLinkCorrectionView",
    "AgentScholarshipDeadlineCheckQueueView",
    "AgentScholarshipDeadlineCheckResultView",
    "AdminScholarshipDeadlineVerificationPackageView",
    "AdminScholarshipDeadlineVerificationQueueView",
    "AdminScholarshipDeadlineVerificationActionView",
    "AdminScholarshipDeadlineApplyView",
    "build_deadline_verification_queue",
    # social
    "AdminScholarshipDraftSocialPostReviewView",
    "AdminScholarshipSocialPostReviewView",
    "AdminScholarshipFacebookPostNowView",
    "AdminScholarshipFacebookScheduleView",
    "AgentFacebookDuePostsView",
    "AgentFacebookPostResultView",
    "AdminSocialOpportunityPlanListView",
    "AdminSocialOpportunityPlanCaptionView",
    "AdminSocialCollectionPlanListView",
    "AdminSocialCollectionPlanCaptionView",
    "AdminSocialLogListView",
    "AdminSocialSchedulerStatusView",
    # reels
    "AdminSocialReelPlanListCreateView",
    "AdminSocialReelPlanDetailView",
    "AdminSocialReelPlanGenerateView",
    "AdminSocialReelPlanRenderView",
    "AgentFacebookDueReelsView",
    "AgentFacebookReelPostedView",
    "AgentFacebookReelFailedView",
]
