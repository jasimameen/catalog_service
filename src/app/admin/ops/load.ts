import "server-only";
import { planKind, planLabel } from "@/lib/billing/status";
import { getServiceClient } from "@/lib/supabase/service";
import type { AccountRow, CatalogStatus, LsStatus } from "@/lib/supabase/types";

export type OpsPlanKind = "subscribed" | "trial" | "none";

export type OpsCatalogRow = {
  id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  accountId: string;
  ownerEmail: string;
  ownerUserId: string;
  plan: OpsPlanKind;
  planLabel: string;
  updatedAt: string;
  transferredAt: string | null;
};

export type OpsUserRow = {
  userId: string;
  email: string;
  createdAt: string;
  catalogCount: number;
  plan: OpsPlanKind;
  planLabel: string;
  accountId: string | null;
};

export type OpsStats = {
  users: number;
  catalogsLive: number;
  catalogsDraft: number;
  subscribed: number;
  trial: number;
  newInquiries: number;
};

export type OpsDeskData = {
  catalogs: OpsCatalogRow[];
  users: OpsUserRow[];
  stats: OpsStats;
};

type CatalogPick = {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  updated_at: string;
  transferred_at?: string | null;
};

type AccountPick = {
  id: string;
  name: string;
  ls_status: LsStatus | null;
  trial_ends_at: string;
  created_at: string;
  order_email: string | null;
};

type MemberPick = {
  account_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

async function listAuthUsers() {
  const service = getServiceClient();
  const users: { id: string; email: string; created_at: string }[] = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("ops listUsers failed", error);
      break;
    }
    for (const user of data.users) {
      users.push({
        id: user.id,
        email: (user.email ?? "").toLowerCase(),
        created_at: user.created_at,
      });
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 40) break;
  }
  return users;
}

export async function loadOpsDesk(): Promise<OpsDeskData> {
  const service = getServiceClient();

  const [catalogsRes, accountsRes, membersRes, inquiriesRes, authUsers] = await Promise.all([
    service
      .from("catalogs")
      .select("id, account_id, name, slug, status, updated_at, transferred_at")
      .order("updated_at", { ascending: false }),
    service.from("accounts").select("id, name, ls_status, trial_ends_at, created_at, order_email"),
    service.from("account_members").select("account_id, user_id, role, created_at"),
    service.from("setup_inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    listAuthUsers(),
  ]);

  const catalogs = (catalogsRes.data ?? []) as CatalogPick[];
  const accounts = (accountsRes.data ?? []) as AccountPick[];
  const members = (membersRes.data ?? []) as MemberPick[];

  const accountById = new Map(accounts.map((row) => [row.id, row]));
  const emailByUserId = new Map(authUsers.map((row) => [row.id, row.email]));
  const membersByAccount = new Map<string, MemberPick[]>();
  const memberByUser = new Map<string, MemberPick>();
  const accountIdsByUser = new Map<string, Set<string>>();
  for (const member of members) {
    const list = membersByAccount.get(member.account_id) ?? [];
    list.push(member);
    membersByAccount.set(member.account_id, list);
    const accounts = accountIdsByUser.get(member.user_id) ?? new Set<string>();
    accounts.add(member.account_id);
    accountIdsByUser.set(member.user_id, accounts);
    if (!memberByUser.has(member.user_id) || member.role === "owner") {
      memberByUser.set(member.user_id, member);
    }
  }

  function ownerForAccount(accountId: string): { email: string; userId: string } {
    const list = membersByAccount.get(accountId) ?? [];
    const owner = list.find((row) => row.role === "owner") ?? list[0];
    if (!owner) {
      const account = accountById.get(accountId);
      return { email: (account?.order_email ?? "").toLowerCase(), userId: "" };
    }
    return {
      email: emailByUserId.get(owner.user_id) || (accountById.get(accountId)?.order_email ?? "").toLowerCase(),
      userId: owner.user_id,
    };
  }

  const catalogCountByAccount = new Map<string, number>();
  for (const catalog of catalogs) {
    catalogCountByAccount.set(catalog.account_id, (catalogCountByAccount.get(catalog.account_id) ?? 0) + 1);
  }

  const catalogRows: OpsCatalogRow[] = catalogs.map((catalog) => {
    const account = accountById.get(catalog.account_id);
    const owner = ownerForAccount(catalog.account_id);
    const billing: Pick<AccountRow, "ls_status" | "trial_ends_at"> = account ?? {
      ls_status: null,
      trial_ends_at: new Date(0).toISOString(),
    };
    return {
      id: catalog.id,
      name: catalog.name,
      slug: catalog.slug,
      status: catalog.status,
      accountId: catalog.account_id,
      ownerEmail: owner.email,
      ownerUserId: owner.userId,
      plan: planKind(billing),
      planLabel: planLabel(billing),
      updatedAt: catalog.updated_at,
      transferredAt: catalog.transferred_at ?? null,
    };
  });

  const seenUsers = new Set<string>();
  const userRows: OpsUserRow[] = [];

  function catalogsForUser(userId: string): number {
    let total = 0;
    for (const accountId of accountIdsByUser.get(userId) ?? []) {
      total += catalogCountByAccount.get(accountId) ?? 0;
    }
    return total;
  }

  function billingForUser(userId: string, fallbackAccountId?: string) {
    const ids = [...(accountIdsByUser.get(userId) ?? [])];
    const preferred = fallbackAccountId && ids.includes(fallbackAccountId) ? fallbackAccountId : ids[0];
    const paid = ids
      .map((id) => accountById.get(id))
      .find((row) => row && planKind(row) === "subscribed");
    const account = paid ?? (preferred ? accountById.get(preferred) : undefined);
    return account ?? {
      ls_status: null,
      trial_ends_at: new Date(0).toISOString(),
    };
  }

  for (const user of authUsers) {
    seenUsers.add(user.id);
    const membership = memberByUser.get(user.id);
    const billing: Pick<AccountRow, "ls_status" | "trial_ends_at"> = billingForUser(
      user.id,
      membership?.account_id,
    );
    userRows.push({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      catalogCount: catalogsForUser(user.id),
      plan: planKind(billing),
      planLabel: planLabel(billing),
      accountId: membership?.account_id ?? null,
    });
  }

  for (const member of members) {
    if (seenUsers.has(member.user_id)) continue;
    const account = accountById.get(member.account_id);
    const billing: Pick<AccountRow, "ls_status" | "trial_ends_at"> = account ?? {
      ls_status: null,
      trial_ends_at: new Date(0).toISOString(),
    };
    userRows.push({
      userId: member.user_id,
      email: (account?.order_email ?? "").toLowerCase() || member.user_id,
      createdAt: member.created_at,
      catalogCount: catalogCountByAccount.get(member.account_id) ?? 0,
      plan: planKind(billing),
      planLabel: planLabel(billing),
      accountId: member.account_id,
    });
  }

  userRows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const stats: OpsStats = {
    users: userRows.length,
    catalogsLive: catalogRows.filter((row) => row.status === "live").length,
    catalogsDraft: catalogRows.filter((row) => row.status === "draft").length,
    subscribed: userRows.filter((row) => row.plan === "subscribed").length,
    trial: userRows.filter((row) => row.plan === "trial").length,
    newInquiries: inquiriesRes.count ?? 0,
  };

  return { catalogs: catalogRows, users: userRows, stats };
}
