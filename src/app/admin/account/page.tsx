import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { PageHeader } from "@/components/admin/PageHeader";
import { getServerSupabase } from "@/lib/supabase/server";
import { AccountSignOutCard, ChangePasswordForm, ReportIssueForm, UpdateEmailForm } from "./AccountForms";

export default async function AccountPage() {
  const account = await requireAccount();
  const user = await getSessionUser();
  const email = user?.email ?? "";
  const supabase = await getServerSupabase();
  const { data: catalogs } = await supabase
    .from("catalogs")
    .select("id, name")
    .eq("account_id", account.id)
    .order("name", { ascending: true });

  return (
    <>
      <PageHeader title="Account" subtitle="Password, email and sign out" account={account} email={email} />
      <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-3 p-4 pb-10 sm:p-6 lg:grid-cols-2">
        <ChangePasswordForm />
        <UpdateEmailForm email={email} />
        <AccountSignOutCard email={email} />
        <ReportIssueForm
          email={email}
          catalogs={(catalogs ?? []).map((row) => ({ id: row.id, name: row.name }))}
        />
      </div>
    </>
  );
}
