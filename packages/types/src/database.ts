export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Timestamp = string;
export type UUID = string;

export type TenantStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";
export type PlatformRole = "user" | "super_admin";
export type TenantMemberRole = "owner" | "staff";
export type TenantMemberStatus = "invited" | "active" | "disabled";
export type StaffInviteStatus = "pending" | "accepted" | "cancelled" | "expired";
export type PropertyStatus = "draft" | "published" | "paused" | "archived";
export type PropertyType = "seasonal_home" | "inn" | "small_hotel";
export type UnitStatus = "active" | "inactive" | "maintenance";
export type ReservationStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "paid" | "cancelled" | "refunded";
export type ExpenseCategoryKind = "income" | "expense";

export type ProfileRow = {
  id: UUID;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  platform_role: PlatformRole;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type TenantRow = {
  id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  status: TenantStatus;
  default_property_type: PropertyType | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type TenantMemberRow = {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  role_id: UUID | null;
  member_role: TenantMemberRole;
  status: TenantMemberStatus;
  property_scope: UUID[] | null;
  invited_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PermissionRow = {
  id: UUID;
  code: PermissionCode;
  name: string;
  module: string;
  description: string | null;
  created_at: Timestamp;
};

export type PermissionCode =
  | "tenants.manage"
  | "dashboard.read"
  | "members.manage"
  | "roles.manage"
  | "features.manage"
  | "properties.read"
  | "properties.manage"
  | "reservations.read"
  | "reservations.manage"
  | "calendar.read"
  | "calendar.manage"
  | "finance.read"
  | "finance.manage"
  | "cleaning.read"
  | "cleaning.manage"
  | "inventory.read"
  | "inventory.manage"
  | "reports.read"
  | "settings.manage"
  | "audit.read";

export type RoleRow = {
  id: UUID;
  tenant_id: UUID | null;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type RolePermissionRow = {
  role_id: UUID;
  permission_id: UUID;
  created_at: Timestamp;
};

export type StaffInviteRow = {
  id: UUID;
  tenant_id: UUID;
  email: string;
  full_name: string;
  phone: string | null;
  role_id: UUID | null;
  invited_user_id: UUID | null;
  invited_by: UUID | null;
  status: StaffInviteStatus;
  token_hash: string;
  expires_at: Timestamp;
  last_sent_at: Timestamp;
  sent_count: number;
  accepted_at: Timestamp | null;
  revoked_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type FeatureFlagRow = {
  id: UUID;
  key: string;
  module: string;
  description: string | null;
  default_enabled: boolean;
  owner_configurable: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TenantFeatureRow = {
  id: UUID;
  tenant_id: UUID;
  feature_flag_id: UUID;
  enabled: boolean;
  configured_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PlanRow = {
  id: UUID;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  max_properties: number;
  max_units: number;
  status: "draft" | "active" | "archived";
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PlanFeatureRow = {
  plan_id: UUID;
  feature_flag_id: UUID;
  enabled: boolean;
  limits: JsonValue;
  created_at: Timestamp;
};

export type SubscriptionRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  plan_id: UUID;
  status: "trialing" | "active" | "past_due" | "paused" | "cancelled";
  starts_at: Timestamp;
  current_period_start: Timestamp | null;
  current_period_end: Timestamp | null;
  cancelled_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type LicenseRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  subscription_id: UUID | null;
  license_key: string;
  status: "trial" | "active" | "expired" | "suspended" | "cancelled";
  starts_at: string;
  expires_at: string | null;
  limits: JsonValue;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PropertyRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  property_type: PropertyType;
  status: PropertyStatus;
  headline: string | null;
  description: string | null;
  address: JsonValue;
  timezone: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type UnitRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  unit_category_id: UUID | null;
  code: string;
  name: string;
  status: UnitStatus;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  base_price: number;
  allow_overbooking: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UnitCategoryRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  name: string;
  description: string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AmenityRow = {
  id: UUID;
  tenant_id: UUID | null;
  code: string;
  name: string;
  category: string | null;
  is_system: boolean;
  created_at: Timestamp;
};

export type PropertyAmenityRow = {
  tenant_id: UUID;
  property_id: UUID;
  amenity_id: UUID;
  created_at: Timestamp;
};

export type MediaAssetRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID | null;
  unit_id: UUID | null;
  media_type: "image" | "video" | "document";
  storage_bucket: string | null;
  storage_path: string | null;
  url: string | null;
  alt: string | null;
  sort_order: number;
  is_cover: boolean;
  status: "active" | "hidden" | "deleted";
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ReservationRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  unit_id: UUID | null;
  owner_id: UUID;
  code: string;
  status: ReservationStatus;
  source: "manual" | "marketplace" | "direct" | "external";
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  guest_notes: string | null;
  internal_notes: string | null;
  cancelled_at: Timestamp | null;
  cancelled_by: UUID | null;
  cancellation_reason: string | null;
  checked_in_at: Timestamp | null;
  checked_out_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ReservationGuestRow = {
  id: UUID;
  tenant_id: UUID;
  reservation_id: UUID;
  full_name: string;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  is_primary: boolean;
  created_at: Timestamp;
};

export type ReservationStatusHistoryRow = {
  id: UUID;
  tenant_id: UUID;
  reservation_id: UUID;
  from_status: ReservationStatus | null;
  to_status: ReservationStatus;
  changed_by: UUID | null;
  reason: string | null;
  metadata: JsonValue;
  created_at: Timestamp;
};

export type ReservationExtraServiceRow = {
  id: UUID;
  tenant_id: UUID;
  reservation_id: UUID;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: "active" | "cancelled";
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ReservationNoteRow = {
  id: UUID;
  tenant_id: UUID;
  reservation_id: UUID;
  note_type: "internal" | "guest" | "system";
  content: string;
  created_by: UUID | null;
  created_at: Timestamp;
};

export type CalendarAvailabilitySource =
  | "manual"
  | "reservation"
  | "period"
  | "ics_import";

export type CalendarAvailabilityStatus =
  | "available"
  | "blocked"
  | "unavailable"
  | "reserved"
  | "released";
export type CleaningTaskStatus =
  | "awaiting_cleaning"
  | "in_cleaning"
  | "completed"
  | "cancelled";
export type CleaningTaskSource = "manual" | "checkout";

export type CalendarAvailabilityBlockRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  unit_id: UUID;
  owner_id: UUID;
  reservation_id: UUID | null;
  source: CalendarAvailabilitySource;
  status: CalendarAvailabilityStatus;
  starts_on: string;
  ends_on: string;
  reason: string | null;
  notes: string | null;
  external_uid: string | null;
  metadata: JsonValue;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CleaningTaskRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  property_id: UUID;
  unit_id: UUID | null;
  reservation_id: UUID | null;
  assigned_to: UUID | null;
  source: CleaningTaskSource;
  status: CleaningTaskStatus;
  title: string;
  notes: string | null;
  scheduled_for: string | null;
  completed_at: Timestamp | null;
  completed_by: UUID | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type FinancialAccountRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  property_id: UUID | null;
  name: string;
  account_type: "cash" | "bank" | "gateway" | "other";
  currency: string;
  status: "active" | "inactive";
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ExpenseCategoryRow = {
  id: UUID;
  tenant_id: UUID;
  name: string;
  kind: ExpenseCategoryKind;
  status: "active" | "inactive";
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TransactionRow = {
  id: UUID;
  tenant_id: UUID;
  financial_account_id: UUID;
  property_id: UUID | null;
  reservation_id: UUID | null;
  expense_category_id: UUID | null;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  due_date: string | null;
  paid_at: Timestamp | null;
  description: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AuditLogRow = {
  id: UUID;
  tenant_id: UUID | null;
  actor_id: UUID | null;
  action: string;
  entity_table: string | null;
  entity_id: UUID | null;
  metadata: JsonValue;
  created_at: Timestamp;
};
