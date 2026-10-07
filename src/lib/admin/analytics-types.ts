export type AdminAnalyticsTabKey =
  | "overview"
  | "competitions"
  | "funnel"
  | "users"
  | "notifications"
  | "risk";

export interface AdminAnalyticsDistributionItem {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface AdminAnalyticsOverview {
  competitions: number;
  activeCompetitions: number;
  applications: number;
  pendingReviews: number;
  approvalRate: number;
  publishedNotices: number;
  thisWeekSubmissions: number;
  highRiskCompetitions: number;
  mediumRiskCompetitions: number;
}

export interface AdminAnalyticsCompetitionItem {
  competitionId: string;
  title: string;
  category: string;
  status: string;
  registrations: number;
  approved: number;
  detailViews: number;
  registerClicks: number;
  heatScore: number;
  conversionRate: number;
}

export interface AdminAnalyticsCompetitionSection {
  ranking: AdminAnalyticsCompetitionItem[];
  statusDistribution: AdminAnalyticsDistributionItem[];
  categoryDistribution: AdminAnalyticsDistributionItem[];
  registrationTrend: Array<{ period: string; value: number }>;
}

export interface AdminAnalyticsFunnelStep {
  key: string;
  label: string;
  count: number;
  rateFromPrev: number;
  rateFromTop: number;
}

export interface AdminAnalyticsUsersSection {
  totalUsers: number;
  activeApplicants: number;
  byCollege: AdminAnalyticsDistributionItem[];
  byMajor: AdminAnalyticsDistributionItem[];
  byGrade: AdminAnalyticsDistributionItem[];
  highIntentUsers: Array<{
    name: string;
    college: string;
    major: string;
    attempts: number;
    latestStatus: string;
  }>;
}

export interface AdminAnalyticsNotificationEffect {
  noticeId: string;
  title: string;
  competition: string;
  within24h: number;
  within72h: number;
}

export interface AdminAnalyticsNotificationsSection {
  publishedCount: number;
  draftCount: number;
  withdrawnCount: number;
  estimatedReadUsers: number;
  estimatedClicks: number;
  conversionRate: number;
  effects: AdminAnalyticsNotificationEffect[];
}

export interface AdminAnalyticsRiskItem {
  competitionId: string;
  title: string;
  status: string;
  registrations: number;
  pendingReviews: number;
  daysToDeadline: number;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  reasons: string[];
}

export interface AdminAnalyticsRiskSection {
  high: number;
  medium: number;
  low: number;
  items: AdminAnalyticsRiskItem[];
}

export interface AdminAnalyticsMethodologySection {
  formula: string;
  factors: string[];
}

export interface AdminAnalyticsMethodology {
  heatScore: AdminAnalyticsMethodologySection;
  riskScore: AdminAnalyticsMethodologySection;
}

export interface AdminAnalyticsPayload {
  generatedAt: string;
  scope: "global" | "competition_scoped";
  assumptions: string[];
  methodology: AdminAnalyticsMethodology;
  overview: AdminAnalyticsOverview;
  competitions: AdminAnalyticsCompetitionSection;
  funnel: AdminAnalyticsFunnelStep[];
  users: AdminAnalyticsUsersSection;
  notifications: AdminAnalyticsNotificationsSection;
  risk: AdminAnalyticsRiskSection;
}
