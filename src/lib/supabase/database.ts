// Minimal hand-written Database type (Tables only, matching supabase/schema.sql)
// so createClient/createServerClient get real Row/Insert/Update types instead
// of defaulting to `never`. Replace with `supabase gen types typescript` once
// the project is live if you want generated types instead.

import type {
  AccountRow,
  AccountMemberRow,
  CatalogRow,
  CatalogItemRow,
  DomainRow,
  OrderRow,
  OrderItemRow,
  OrderStatusEventRow,
  CatalogViewRow,
  ReservationRow,
  ReservationStatusEventRow,
  ServiceRequestRow,
  SetupInquiryRow,
  EmailOtpChallengeRow,
} from "./types";

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      accounts: TableDef<AccountRow>;
      account_members: TableDef<AccountMemberRow>;
      catalogs: TableDef<CatalogRow>;
      catalog_items: TableDef<CatalogItemRow>;
      domains: TableDef<DomainRow>;
      orders: TableDef<OrderRow>;
      order_items: TableDef<OrderItemRow>;
      order_status_events: TableDef<OrderStatusEventRow>;
      catalog_views: TableDef<CatalogViewRow>;
      reservations: TableDef<ReservationRow>;
      reservation_status_events: TableDef<ReservationStatusEventRow>;
      service_requests: TableDef<ServiceRequestRow>;
      setup_inquiries: TableDef<SetupInquiryRow>;
      email_otp_challenges: TableDef<EmailOtpChallengeRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
