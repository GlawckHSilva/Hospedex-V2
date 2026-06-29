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
/** @deprecated Unidade foi removida do modelo ativo da V2; manter apenas para colunas legadas. */
export type UnitStatus = "active" | "inactive" | "maintenance";
export type ReservationStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled";
export type ReservationPaymentStatus =
  | "pending"
  | "partial"
  | "paid"
  | "received"
  | "overdue"
  | "refunded"
  | "cancelled";
export type ReservationChargeType =
  | "deposit"
  | "remaining"
  | "full"
  | "extra"
  | "adjustment"
  | "refund";
export type ReservationChargeStatus =
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";
export type ReservationPaymentRecordStatus =
  | "pending_review"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "refunded";
export type ReservationPaymentMethod =
  | "pix"
  | "cash"
  | "debit_card"
  | "credit_card"
  | "bank_transfer";
export type ReviewStatus = "pending" | "approved" | "hidden";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "paid" | "cancelled" | "refunded";
export type ExpenseCategoryKind = "income" | "expense";
export type ExtraServiceChargeType =
  | "fixed"
  | "per_night"
  | "per_guest"
  | "per_reservation";
export type ExtraServiceStatus = "active" | "inactive";
export type RegionalGuideCategory =
  | "restaurants"
  | "snack_bars"
  | "coffee_shops"
  | "markets"
  | "pharmacies"
  | "hospitals"
  | "tours"
  | "beaches"
  | "waterfalls"
  | "tourist_spots"
  | "nightlife"
  | "others";
export type RegionalGuideStatus = "active" | "inactive";
export type TenantCleaningPolicy = "after_checkout" | "daily" | "on_request" | "none";
export type ManagementNotificationType =
  | "new_reservation"
  | "reservation_cancelled"
  | "checkin_today"
  | "checkout_today"
  | "cleaning_pending"
  | "payment_awaiting_confirmation"
  | "payment_confirmed"
  | "license_expiring";
export type IntegrationProvider =
  | "whatsapp"
  | "google_maps"
  | "weather"
  | "payments"
  | "email"
  | "ical"
  | "airbnb"
  | "booking";
export type IntegrationStatus =
  | "disabled"
  | "not_configured"
  | "pending_backend"
  | "connected"
  | "error";

export type ProfileRow = {
  id: UUID;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  document_number: string | null;
  city: string | null;
  state: string | null;
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
  | "reviews.read"
  | "reviews.manage"
  | "calendar.read"
  | "calendar.manage"
  | "finance.read"
  | "finance.manage"
  | "cleaning.read"
  | "cleaning.manage"
  | "inventory.read"
  | "inventory.manage"
  | "reports.read"
  | "integrations.read"
  | "integrations.manage"
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

export type TenantSettingRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  logo_url: string | null;
  primary_color: string;
  phone: string | null;
  whatsapp: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_bank_name: string | null;
  pix_payment_note: string | null;
  cash_payment_instructions: string | null;
  debit_card_payment_instructions: string | null;
  credit_card_payment_instructions: string | null;
  credit_card_installments_note: string | null;
  bank_transfer_payment_instructions: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  short_description: string | null;
  default_check_in_time: string;
  default_check_out_time: string;
  cleaning_policy: TenantCleaningPolicy;
  allow_manual_reservations: boolean;
  require_payment_confirmation: boolean;
  require_checkin_confirmation: boolean;
  require_checkout_confirmation: boolean;
  metadata: JsonValue;
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
  short_description: string | null;
  full_description: string | null;
  is_public: boolean;
  marketplace_featured: boolean;
  public_details: JsonValue;
  address: JsonValue;
  structure_details: JsonValue;
  pricing_details: JsonValue;
  timezone: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type PropertySettingRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  booking_mode: "manual_approval" | "instant_booking";
  check_in_time: string | null;
  check_out_time: string | null;
  min_nights: number;
  max_nights: number | null;
  settings: JsonValue;
  allow_children: boolean;
  allow_pets: boolean;
  allow_smoking: boolean;
  allow_events: boolean;
  max_guests: number;
  min_responsible_age: number;
  additional_rules: string | null;
  special_instructions: string | null;
  internal_notes: string | null;
  cancellation_refund_until_days: number;
  cancellation_refund_until_percentage: number;
  cancellation_late_until_days: number;
  cancellation_late_refund_percentage: number;
  cancellation_no_refund_within_days: number;
  cancellation_notes: string | null;
  min_advance_days: number;
  max_advance_days: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/** @deprecated Tabela legada. A casa/propriedade e o recurso reservavel da V2. */
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

/** @deprecated Tabela legada. Categorias de unidade nao devem aparecer na UI da V2. */
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
  guest_user_id: UUID | null;
  code: string;
  status: ReservationStatus;
  source: "manual" | "marketplace" | "direct" | "external";
  check_in: string;
  check_out: string;
  expected_checkin_time: string | null;
  expected_checkout_time: string | null;
  guests_count: number;
  total_amount: number;
  currency: string;
  payment_method: ReservationPaymentMethod | null;
  payment_status: ReservationPaymentStatus;
  payment_status_updated_at: Timestamp | null;
  payment_status_updated_by: UUID | null;
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

export type ExtraServiceRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  name: string;
  description: string | null;
  amount: number;
  charge_type: ExtraServiceChargeType;
  status: ExtraServiceStatus;
  is_required: boolean;
  applies_to_all_properties: boolean;
  internal_notes: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type ExtraServicePropertyRow = {
  id: UUID;
  tenant_id: UUID;
  extra_service_id: UUID;
  property_id: UUID;
  created_at: Timestamp;
};

export type RegionalGuideLocationRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  category: RegionalGuideCategory;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website_url: string | null;
  opening_hours: string | null;
  cover_image_url: string | null;
  display_order: number;
  status: RegionalGuideStatus;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
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

export type ReservationChargeRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  reservation_id: UUID;
  charge_type: ReservationChargeType;
  amount: number;
  amount_paid: number;
  currency: string;
  due_at: Timestamp | null;
  status: ReservationChargeStatus;
  payment_method: ReservationPaymentMethod | null;
  payment_provider: "manual" | "gateway" | "none";
  payment_link: string | null;
  pix_copy_paste: string | null;
  pix_qr_code: string | null;
  manual_instructions: string | null;
  internal_notes: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ReservationPaymentRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  reservation_id: UUID;
  charge_id: UUID | null;
  amount: number;
  currency: string;
  payment_method: ReservationPaymentMethod | null;
  status: ReservationPaymentRecordStatus;
  proof_url: string | null;
  gateway_transaction_id: string | null;
  notes: string | null;
  confirmed_by: UUID | null;
  confirmed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ReservationWhatsappMessageStatus =
  | "prepared"
  | "copied"
  | "opened"
  | "sent_future";

export type ReservationWhatsappMessageRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  reservation_id: UUID;
  guest_phone: string | null;
  message_body: string;
  whatsapp_url: string | null;
  status: ReservationWhatsappMessageStatus;
  requires_manual_review: boolean;
  review_reason: string | null;
  prepared_by: UUID | null;
  prepared_at: Timestamp;
  copied_at: Timestamp | null;
  opened_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PropertyReviewRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  property_id: UUID;
  reservation_id: UUID | null;
  guest_name: string;
  guest_email: string | null;
  rating: number;
  comment: string;
  reviewed_at: Timestamp;
  status: ReviewStatus;
  owner_response: string | null;
  owner_responded_at: Timestamp | null;
  response_author_id: UUID | null;
  hidden_at: Timestamp | null;
  hidden_by: UUID | null;
  metadata: JsonValue;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CalendarAvailabilitySource =
  | "manual"
  | "reservation"
  | "period"
  | "ics_import";

export type CalendarAvailabilityStatus =
  | "available"
  | "blocked"
  | "interdicted"
  | "maintenance"
  | "cleaning"
  | "unavailable"
  | "reserved"
  | "released";
export type CleaningTaskStatus =
  | "awaiting_cleaning"
  | "in_cleaning"
  | "completed"
  | "cancelled";
export type CleaningTaskSource = "manual" | "checkout";
export type CrmGuestStatus = "active" | "blocked" | "deleted";
export type CrmGuestRating =
  | "excellent"
  | "good"
  | "neutral"
  | "attention"
  | "blocked";
export type InventoryItemCategory =
  | "kitchen"
  | "bedrooms"
  | "bathrooms"
  | "outdoor_area"
  | "electronics"
  | "furniture"
  | "bed_linen"
  | "cleaning"
  | "other";
export type InventoryConservationState =
  | "new"
  | "good"
  | "used"
  | "damaged"
  | "missing";
export type MaintenanceTaskType =
  | "preventive"
  | "corrective"
  | "inspection"
  | "replacement"
  | "technical_cleaning"
  | "other";
export type MaintenanceTaskPriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceTaskStatus = "pending" | "completed" | "cancelled";

export type CalendarAvailabilityBlockRow = {
  id: UUID;
  tenant_id: UUID;
  property_id: UUID;
  unit_id: UUID | null;
  owner_id: UUID;
  reservation_id: UUID | null;
  source: CalendarAvailabilitySource;
  status: CalendarAvailabilityStatus;
  block_type:
    | "manual"
    | "interdicted"
    | "maintenance"
    | "temporary_unavailable"
    | "cleaning"
    | "reservation";
  blocks_availability: boolean;
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

export type CrmGuestRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  full_name: string;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  city: string | null;
  state: string | null;
  birth_date: string | null;
  status: CrmGuestStatus;
  internal_rating: CrmGuestRating;
  private_notes: string | null;
  metadata: JsonValue;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type InventoryItemRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  property_id: UUID;
  unit_id: UUID | null;
  category: InventoryItemCategory;
  name: string;
  quantity: number;
  estimated_value: number;
  conservation_state: InventoryConservationState;
  image_url: string | null;
  notes: string | null;
  metadata: JsonValue;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

export type MaintenanceTaskRow = {
  id: UUID;
  tenant_id: UUID;
  owner_id: UUID;
  property_id: UUID;
  unit_id: UUID | null;
  inventory_item_id: UUID | null;
  assigned_to: UUID | null;
  maintenance_type: MaintenanceTaskType;
  priority: MaintenanceTaskPriority;
  status: MaintenanceTaskStatus;
  title: string;
  notes: string | null;
  scheduled_for: string | null;
  completed_at: Timestamp | null;
  completed_by: UUID | null;
  metadata: JsonValue;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ManagementNotificationStateRow = {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  notification_key: string;
  read_at: Timestamp | null;
  deleted_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TenantIntegrationRow = {
  id: UUID;
  tenant_id: UUID;
  provider: IntegrationProvider;
  enabled: boolean;
  status: IntegrationStatus;
  public_settings: JsonValue;
  configured_at: Timestamp | null;
  configured_by: UUID | null;
  last_synced_at: Timestamp | null;
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
  reservation_charge_id: UUID | null;
  reservation_payment_id: UUID | null;
  expense_category_id: UUID | null;
  guest_name: string | null;
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
