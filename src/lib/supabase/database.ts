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
  CatalogViewRow,
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
      catalog_views: TableDef<CatalogViewRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
