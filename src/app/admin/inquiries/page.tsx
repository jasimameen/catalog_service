import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { canManageSetupInquiries } from "@/lib/inquiries/access";
import { getServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/admin/PageHeader";
import type { SetupInquiryRow } from "@/lib/supabase/types";
import { InquiryInbox } from "./InquiryInbox";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const account = await requireAccount({ next: "/admin/inquiries" });
  const user = await getSessionUser();
  const allowed = canManageSetupInquiries(user?.email);

  if (!allowed) {
    return (
      <>
        <PageHeader title="Setup inquiries" subtitle="Platform inbox" account={account} />
        <p className="p-4 text-[14px] text-[var(--cat-muted)] sm:p-8">
          This inbox is for Instant Catalog concierge requests, not merchant orders.
        </p>
      </>
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("setup_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  const inquiries = error ? [] : ((data ?? []) as SetupInquiryRow[]);
  const fresh = inquiries.filter((row) => row.status === "new").length;

  return (
    <>
      <PageHeader
        title="Setup inquiries"
        subtitle={`${inquiries.length} total · ${fresh} new`}
        account={account}
        email={user?.email ?? ""}
      />
      <div className="p-4 pb-16 sm:p-8">
        {error ? (
          <p className="mb-4 text-[13px] text-[#b2432b]">Could not load inquiries. Run supabase/setup-inquiries.sql.</p>
        ) : null}
        <InquiryInbox inquiries={inquiries} />
      </div>
    </>
  );
}
