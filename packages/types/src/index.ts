export type AppEnvironment = "local" | "preview" | "production";

export type AppSurface = "marketplace" | "gestao" | "admin";

export type UserRole = "guest" | "owner" | "staff" | "super_admin";

export type {
  PropertyStatus,
  PropertyType,
  ReservationStatus,
  TenantStatus,
  UnitStatus
} from "./database";
export type {
  AuditLogRow,
  AmenityRow,
  CalendarAvailabilityBlockRow,
  CalendarAvailabilitySource,
  CalendarAvailabilityStatus,
  ExpenseCategoryKind,
  ExpenseCategoryRow,
  FeatureFlagRow,
  FinancialAccountRow,
  JsonValue,
  LicenseRow,
  PermissionCode,
  PermissionRow,
  PlanFeatureRow,
  PlanRow,
  PlatformRole,
  ProfileRow,
  MediaAssetRow,
  PropertyAmenityRow,
  PropertyRow,
  ReservationExtraServiceRow,
  ReservationGuestRow,
  ReservationNoteRow,
  ReservationRow,
  ReservationStatusHistoryRow,
  RoleRow,
  RolePermissionRow,
  StaffInviteRow,
  StaffInviteStatus,
  SubscriptionRow,
  TenantFeatureRow,
  TenantMemberRole,
  TenantMemberRow,
  TenantMemberStatus,
  TenantRow,
  Timestamp,
  TransactionStatus,
  TransactionType,
  TransactionRow,
  UnitCategoryRow,
  UUID,
  UnitRow
} from "./database";

export type ModuleKey =
  | "marketplace"
  | "property_management"
  | "reservations"
  | "finance"
  | "crm"
  | "inventory"
  | "cleaning"
  | "staff"
  | "reports"
  | "automations"
  | "calendar"
  | "multi_unit"
  | "advanced_rates"
  | "feature_flags"
  | "ai";

export type FeatureFlagKey =
  | "marketplace_visibility"
  | "auto_booking"
  | "manual_approval"
  | "payments"
  | "gateway_primary"
  | "extra_services"
  | "reviews"
  | "regional_guide"
  | "calendar"
  | "advanced_rates"
  | "multi_unit"
  | "ics_sync"
  | "cleaning"
  | "inventory"
  | "staff"
  | "crm"
  | "automations"
  | "ai_assistant"
  | "ai_pricing"
  | "api_future"
  | "reports";

export type TenantScope = {
  tenantId: string;
  ownerId?: string;
  propertyId?: string;
};

export type TenantContext = TenantScope & {
  status: DatabaseTenantStatus;
  role: UserRole;
  enabledModules: ModuleKey[];
};

export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
  module?: ModuleKey;
};

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  module: ModuleKey;
  defaultEnabled: boolean;
  ownerConfigurable: boolean;
  superAdminOnly?: boolean;
};
import type { TenantStatus as DatabaseTenantStatus } from "./database";
