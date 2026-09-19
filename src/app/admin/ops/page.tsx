import { requirePlatformOperator } from "@/lib/auth/platform";
import { PageHeader } from "@/components/admin/PageHeader";
import { OpsDesk } from "./OpsDesk";
import { loadOpsDesk } from "./load";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const gate = await requirePlatformOperator();

  if (!gate.ok) {
    return (
      <>
        <PageHeader title="Platform" subtitle="Operator desk" account={gate.account} />
        <p className="p-4 text-[14px] text-[var(--cat-muted)] sm:p-8">
          This desk is for Instant Catalog operators, not merchant shops.
        </p>
      </>
    );
  }

  let data;
  try {
    data = await loadOpsDesk();
  } catch (error) {
    console.error("loadOpsDesk failed", error);
    return (
      <>
        <PageHeader
          title="Platform"
          subtitle="Operator desk"
          account={gate.account}
          email={gate.user.email ?? ""}
        />
        <p className="p-4 text-[14px] text-[#b2432b] sm:p-8">Could not load the operator desk. Refresh and try again.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Platform"
        subtitle={`${data.stats.users} users · ${data.stats.catalogsLive + data.stats.catalogsDraft} catalogs`}
        account={gate.account}
        email={gate.user.email ?? ""}
      />
      <div className="p-4 pb-16 sm:p-8">
        <OpsDesk data={data} />
      </div>
    </>
  );
}
