import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { PageHeader } from "@/components/admin/PageHeader";
import { AccountSignOutCard, ChangePasswordForm, UpdateEmailForm } from "./AccountForms";

export default async function AccountPage() {
  const account = await requireAccount();
  const user = await getSessionUser();
  const email = user?.email ?? "";

  return (
    <>
      <PageHeader title="Account" subtitle="Password, email and sign out" account={account} email={email} />
      <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-3 p-4 pb-10 sm:p-6 lg:grid-cols-2">
        <ChangePasswordForm />
        <UpdateEmailForm email={email} />
        <AccountSignOutCard email={email} />
      </div>
    </>
  );
}
