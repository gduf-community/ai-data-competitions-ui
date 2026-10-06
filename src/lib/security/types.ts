export interface SecurityEventView {
  id: string;
  source: string;
  eventType: string;
  severity: string;
  ip: string | null;
  userId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  userAgent: string | null;
  requestId: string | null;
  origin: string | null;
  referer: string | null;
  ruleId: string | null;
  ruleMessage: string | null;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
  alertId: string | null;
  createdAt: string;
}

export interface SecurityAlertView {
  id: string;
  alertType: string;
  severity: string;
  status: "new" | "ack" | "resolved" | "ignored";
  ruleId: string;
  targetType: string;
  targetValue: string;
  summary: string;
  suggestedAction: string | null;
  eventCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  evidence: Record<string, unknown>;
  fingerprint: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityActionView {
  id: string;
  actionType: string;
  targetType: string;
  targetValue: string;
  sourceAlertId: string | null;
  reason: string;
  status: "pending" | "executing" | "success" | "failed" | "expired" | "rolled_back";
  ttlSeconds: number | null;
  expiresAt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  executedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityActionReceiptView {
  id: string;
  actionId: string;
  executor: string;
  status: string;
  detail: string | null;
  raw: Record<string, unknown>;
  observedAt: string;
}

export interface SecurityListPayload<TItem> {
  total: number;
  page: number;
  pageSize: number;
  items: TItem[];
}

export interface SituationAccessLogView {
  id: number;
  ip: string;
  maskedIp: string;
  country: string | null;
  province: string | null;
  city: string | null;
  isp: string | null;
  path: string | null;
  method: string | null;
  isGuangdong: boolean;
  isWhitelisted: boolean;
  isBlocked: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  reason: string | null;
  createdAt: string;
}

export interface SituationTrendPointView {
  slot: string;
  total: number;
  blocked: number;
}

export interface SituationOverviewView {
  today: {
    total: number;
    guangdong: number;
    blocked: number;
    whitelist: number;
  };
  windows: {
    fiveMinutes: { total: number; blocked: number };
    oneHour: { total: number; blocked: number };
    twentyFourHours: { total: number; blocked: number };
  };
  riskDistribution: Array<{ riskLevel: string; count: number }>;
  topProvinces: Array<{ province: string; total: number; blocked: number }>;
  trends: {
    fiveMinutes: SituationTrendPointView[];
    oneHour: SituationTrendPointView[];
    twentyFourHours: SituationTrendPointView[];
  };
}

export interface SituationMapPointView {
  ip: string;
  maskedIp: string;
  country: string | null;
  province: string | null;
  city: string | null;
  lng: number;
  lat: number;
  count: number;
  blocked: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  lastSeen: string;
}

export interface SituationMapView {
  points: SituationMapPointView[];
  stats: {
    total: number;
    guangdong: number;
    blocked: number;
    whitelist: number;
  };
}

export interface SituationWhitelistEntryView {
  id: number;
  ipCidr: string;
  remark: string | null;
  createdBy: string | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface SituationAccessPolicyView {
  id: number;
  name: string;
  policyType: string;
  enabled: boolean;
  config: {
    allowProvinces: string[];
    allowWhitelist: boolean;
    blockUnknownRegion: boolean;
    adminBypass: boolean;
    allowLocalhost: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Persistence contracts; server facades preserve their original type exports.


export type SecuritySeverity = "info" | "low" | "medium" | "high" | "critical";

export type SecuritySource =
  | "app"
  | "middleware"
  | "auth"
  | "upload"
  | "admin"
  | "waf"
  | "client"
  | "cloudflare";

export type SecurityAlertStatus = "new" | "ack" | "resolved" | "ignored";

export type SecurityActionStatus =
  | "pending"
  | "executing"
  | "success"
  | "failed"
  | "expired"
  | "rolled_back";

export interface SecurityEventInput {
  source: SecuritySource | string;
  eventType: string;
  severity?: SecuritySeverity | string;
  ip?: string | null;
  userId?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  userAgent?: string | null;
  requestId?: string | null;
  origin?: string | null;
  referer?: string | null;
  ruleId?: string | null;
  ruleMessage?: string | null;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  alertId?: string | null;
  createdAt?: Date;
}

export interface SecurityEventRecord {
  id: string;
  source: string;
  eventType: string;
  severity: string;
  ip: string | null;
  userId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  userAgent: string | null;
  requestId: string | null;
  origin: string | null;
  referer: string | null;
  ruleId: string | null;
  ruleMessage: string | null;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
  alertId: string | null;
  createdAt: string;
}

export interface SecurityEventFilter {
  eventType?: string;
  severity?: string;
  source?: string;
  ip?: string;
  userId?: string;
  path?: string;
  status?: number;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface SecurityAlertRecord {
  id: string;
  alertType: string;
  severity: string;
  status: SecurityAlertStatus;
  ruleId: string;
  targetType: string;
  targetValue: string;
  summary: string;
  suggestedAction: string | null;
  eventCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  evidence: Record<string, unknown>;
  fingerprint: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAlertInput {
  alertType: string;
  severity: SecuritySeverity | string;
  ruleId: string;
  targetType: string;
  targetValue: string;
  summary: string;
  suggestedAction?: string | null;
  eventCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  evidence?: Record<string, unknown>;
  fingerprint: string;
}

export interface SecurityAlertFilter {
  alertType?: string;
  severity?: string;
  status?: SecurityAlertStatus;
  targetType?: string;
  targetValue?: string;
  ruleId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface SecurityActionRecord {
  id: string;
  actionType: string;
  targetType: string;
  targetValue: string;
  sourceAlertId: string | null;
  reason: string;
  status: SecurityActionStatus;
  ttlSeconds: number | null;
  expiresAt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  executedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityActionInput {
  actionType: string;
  targetType: string;
  targetValue: string;
  sourceAlertId?: string | null;
  reason: string;
  ttlSeconds?: number | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SecurityActionFilter {
  actionType?: string;
  targetType?: string;
  targetValue?: string;
  status?: SecurityActionStatus;
  page?: number;
  pageSize?: number;
}

export interface SecurityActionReceiptRecord {
  id: string;
  actionId: string;
  executor: string;
  status: string;
  detail: string | null;
  raw: Record<string, unknown>;
  observedAt: string;
}

export interface SecurityActionReceiptInput {
  actionId: string;
  executor: string;
  status: string;
  detail?: string | null;
  raw?: Record<string, unknown>;
  observedAt?: Date;
}

// Persistence contracts; server facades preserve their original type exports.


export type SituationRiskLevel = "low" | "medium" | "high" | "critical";

export interface AccessPolicyConfig {
  allowProvinces: string[];
  allowWhitelist: boolean;
  blockUnknownRegion: boolean;
  adminBypass: boolean;
  allowLocalhost: boolean;
}

export interface AccessPolicyRecord {
  id: number;
  name: string;
  policyType: string;
  enabled: boolean;
  config: AccessPolicyConfig;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLogInput {
  ip: string;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  isp?: string | null;
  path?: string | null;
  method?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  isGuangdong: boolean;
  isWhitelisted: boolean;
  isBlocked: boolean;
  riskLevel: SituationRiskLevel;
  reason?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface AccessLogRecord {
  id: number;
  ip: string;
  ipHash: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  isp: string | null;
  path: string | null;
  method: string | null;
  userAgent: string | null;
  referer: string | null;
  isGuangdong: boolean;
  isWhitelisted: boolean;
  isBlocked: boolean;
  riskLevel: SituationRiskLevel;
  reason: string | null;
  userId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AccessLogFilter {
  from?: Date;
  to?: Date;
  ip?: string;
  riskLevel?: SituationRiskLevel;
  isBlocked?: boolean;
  path?: string;
  page?: number;
  pageSize?: number;
}

export interface SituationTrendPoint {
  slot: string;
  total: number;
  blocked: number;
}

export interface SituationOverviewPayload {
  today: {
    total: number;
    guangdong: number;
    blocked: number;
    whitelist: number;
  };
  windows: {
    fiveMinutes: { total: number; blocked: number };
    oneHour: { total: number; blocked: number };
    twentyFourHours: { total: number; blocked: number };
  };
  riskDistribution: Array<{ riskLevel: string; count: number }>;
  topProvinces: Array<{ province: string; total: number; blocked: number }>;
  trends: {
    fiveMinutes: SituationTrendPoint[];
    oneHour: SituationTrendPoint[];
    twentyFourHours: SituationTrendPoint[];
  };
}

export interface SituationMapPoint {
  ip: string;
  country: string | null;
  province: string | null;
  city: string | null;
  lng: number;
  lat: number;
  count: number;
  blocked: boolean;
  riskLevel: SituationRiskLevel;
  lastSeen: string;
}

export interface SituationMapPayload {
  points: SituationMapPoint[];
  stats: {
    total: number;
    guangdong: number;
    blocked: number;
    whitelist: number;
  };
}

export interface IpWhitelistEntryRecord {
  id: number;
  ipCidr: string;
  remark: string | null;
  createdBy: string | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
}
