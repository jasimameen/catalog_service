"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashBtnGhost, dashBtnPrimary, dashCard, dashHint, dashInput, dashKicker } from "@/components/admin/dashboard/styles";
import { grantAccountPlan, transferCatalog } from "./actions";
import type { OpsCatalogRow, OpsDeskData, OpsUserRow } from "./load";

type Tab = "catalogs" | "users" | "subscribed";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

export function OpsDesk({ data }: { data: OpsDeskData }) {
  const [tab, setTab] = useState<Tab>("catalogs");
  const [query, setQuery] = useState("");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const catalogs = useMemo(
    () =>
      data.catalogs.filter((row) =>
        matchesQuery(`${row.name} ${row.slug} ${row.ownerEmail} ${row.ownerUserId} ${row.planLabel}`, q),
      ),
    [data.catalogs, q],
  );

  const users = useMemo(
    () => data.users.filter((row) => matchesQuery(`${row.email} ${row.userId} ${row.planLabel}`, q)),
    [data.users, q],
  );

  const subscribed = useMemo(
    () => users.filter((row) => row.plan === "subscribed"),
    [users],
  );

  const transferRow = data.catalogs.find((row) => row.id === transferId) ?? null;
  const grantRow = data.users.find((row) => row.userId === grantUserId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${dashCard} p-4 sm:p-5`}>
        <p className={dashKicker}>Concierge</p>
        <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
          Build under Hevyf, then hand the shop over
        </h2>
        <ol className="mt-3 grid gap-2 text-[13px] leading-relaxed text-[var(--cat-muted)] sm:grid-cols-3">
          <li className="rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3 py-2.5">
            <span className="font-medium text-[var(--cat-ink)]">1. New catalog</span>
            <p className={`${dashHint} mt-1`}>
              Create it on this operator account —{" "}
              <Link href="/new" className="underline">
                /new
              </Link>
              .
            </p>
          </li>
          <li className="rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3 py-2.5">
            <span className="font-medium text-[var(--cat-ink)]">2. Set it up</span>
            <p className={`${dashHint} mt-1`}>Items, floor, look, domains. Same admin Tea Day uses.</p>
          </li>
          <li className="rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3 py-2.5">
            <span className="font-medium text-[var(--cat-ink)]">3. Transfer</span>
            <p className={`${dashHint} mt-1`}>
              Move by customer email. Items, orders, reservations, floor and settings stay. They see it on their dashboard; you lose it.
            </p>
          </li>
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={data.stats.users} />
        <Stat label="Live catalogs" value={data.stats.catalogsLive} />
        <Stat label="Draft catalogs" value={data.stats.catalogsDraft} />
        <Stat label="Subscribed" value={data.stats.subscribed} />
        <Stat label="Trial" value={data.stats.trial} />
        <Stat
          label="New inquiries"
          value={data.stats.newInquiries}
          href="/admin/inquiries"
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <TabChip label="Catalogs" count={catalogs.length} active={tab === "catalogs"} onClick={() => setTab("catalogs")} />
          <TabChip label="Users" count={users.length} active={tab === "users"} onClick={() => setTab("users")} />
          <TabChip
            label="Subscribed"
            count={subscribed.length}
            active={tab === "subscribed"}
            onClick={() => setTab("subscribed")}
          />
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tab === "catalogs" ? "Filter name, slug, owner…" : "Filter email…"}
          className={`${dashInput} sm:max-w-xs`}
        />
      </div>

      {tab === "catalogs" ? (
        <CatalogsPanel rows={catalogs} onTransfer={setTransferId} />
      ) : (
        <UsersPanel
          rows={tab === "subscribed" ? subscribed : users}
          onGrant={setGrantUserId}
        />
      )}

      {transferRow ? (
        <TransferDialog
          catalog={transferRow}
          onClose={() => setTransferId(null)}
        />
      ) : null}
      {grantRow ? <GrantDialog user={grantRow} onClose={() => setGrantUserId(null)} /> : null}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <p className={dashKicker}>{label}</p>
      <p className="mt-1.5 text-[22px] font-semibold tracking-tight text-[var(--cat-ink)]">{value}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`${dashCard} p-3.5 no-underline`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${dashCard} p-3.5`}>{inner}</div>;
}

function TabChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 text-[13px] ${
        active
          ? "border-[var(--cat-ink)] bg-[var(--cat-ink)] font-medium text-white"
          : "border-[var(--cat-border)] bg-white text-[var(--cat-muted)]"
      }`}
    >
      {label} · {count}
    </button>
  );
}

function CatalogsPanel({
  rows,
  onTransfer,
}: {
  rows: OpsCatalogRow[];
  onTransfer: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className={`${dashCard} p-5 text-[14px] text-[var(--cat-muted)]`}>No catalogs match.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden overflow-hidden rounded-[14px] border border-[#e2e7ee] md:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[#fbfbfd] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold">Catalog</th>
              <th className="px-3.5 py-2.5 font-semibold">Owner</th>
              <th className="px-3.5 py-2.5 font-semibold">Plan</th>
              <th className="px-3.5 py-2.5 font-semibold">Activity</th>
              <th className="px-3.5 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#f1f4f8]">
                <td className="px-3.5 py-3 align-top">
                  <p className="font-medium text-[var(--cat-ink)]">{row.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">{row.slug}</p>
                  <StatusDot live={row.status === "live"} />
                </td>
                <td className="px-3.5 py-3 align-top">
                  <p className="break-all text-[var(--cat-ink)]">{row.ownerEmail || "—"}</p>
                  {row.ownerUserId ? (
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--cat-muted)]">{row.ownerUserId}</p>
                  ) : null}
                </td>
                <td className="px-3.5 py-3 align-top text-[var(--cat-muted)]">{row.planLabel}</td>
                <td className="px-3.5 py-3 align-top text-[var(--cat-muted)]">
                  {formatWhen(row.updatedAt)}
                  {row.transferredAt ? (
                    <p className="mt-0.5 text-[11px]">Moved {formatWhen(row.transferredAt)}</p>
                  ) : null}
                </td>
                <td className="px-3.5 py-3 align-top">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link href={`/admin/${row.id}`} className={`${dashBtnGhost} min-h-9 px-3 text-[12px]`}>
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => onTransfer(row.id)}
                      className={`${dashBtnGhost} min-h-9 px-3 text-[12px]`}
                    >
                      Transfer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className={`${dashCard} p-3.5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[var(--cat-ink)]">{row.name}</p>
                <p className="text-[12px] text-[var(--cat-muted)]">{row.slug}</p>
              </div>
              <StatusDot live={row.status === "live"} />
            </div>
            <p className="mt-2 break-all text-[12px] text-[var(--cat-ink)]">{row.ownerEmail || "—"}</p>
            <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
              {row.planLabel} · {formatWhen(row.updatedAt)}
            </p>
            <div className="mt-3 flex gap-1.5">
              <Link href={`/admin/${row.id}`} className={`${dashBtnGhost} flex-1 text-[12px]`}>
                Open
              </Link>
              <button type="button" onClick={() => onTransfer(row.id)} className={`${dashBtnGhost} flex-1 text-[12px]`}>
                Transfer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersPanel({
  rows,
  onGrant,
}: {
  rows: OpsUserRow[];
  onGrant: (userId: string) => void;
}) {
  if (rows.length === 0) {
    return <p className={`${dashCard} p-5 text-[14px] text-[var(--cat-muted)]`}>No users match.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden overflow-hidden rounded-[14px] border border-[#e2e7ee] md:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[#fbfbfd] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold">Email</th>
              <th className="px-3.5 py-2.5 font-semibold">Created</th>
              <th className="px-3.5 py-2.5 font-semibold">Catalogs</th>
              <th className="px-3.5 py-2.5 font-semibold">Plan</th>
              <th className="px-3.5 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-t border-[#f1f4f8]">
                <td className="px-3.5 py-3 align-top">
                  <p className="break-all text-[var(--cat-ink)]">{row.email || "—"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--cat-muted)]">{row.userId}</p>
                </td>
                <td className="px-3.5 py-3 align-top text-[var(--cat-muted)]">{formatWhen(row.createdAt)}</td>
                <td className="px-3.5 py-3 align-top text-[var(--cat-ink)]">{row.catalogCount}</td>
                <td className="px-3.5 py-3 align-top text-[var(--cat-muted)]">{row.planLabel}</td>
                <td className="px-3.5 py-3 align-top">
                  {row.accountId ? (
                    <button
                      type="button"
                      onClick={() => onGrant(row.userId)}
                      className={`${dashBtnGhost} min-h-9 px-3 text-[12px]`}
                    >
                      Grant
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={row.userId} className={`${dashCard} p-3.5`}>
            <p className="break-all text-[14px] font-medium text-[var(--cat-ink)]">{row.email || "—"}</p>
            <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
              {formatWhen(row.createdAt)} · {row.catalogCount} catalogs · {row.planLabel}
            </p>
            {row.accountId ? (
              <button
                type="button"
                onClick={() => onGrant(row.userId)}
                className={`${dashBtnGhost} mt-3 text-[12px]`}
              >
                Grant
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ live }: { live: boolean }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: live ? "#1e9e4a" : "#c7c7cc" }} />
      {live ? "Live" : "Unpublished"}
    </span>
  );
}

function TransferDialog({
  catalog,
  onClose,
}: {
  catalog: OpsCatalogRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await transferCatalog({ catalogId: catalog.id, email, confirm });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      setDone(
        result.invited
          ? `Moved ${catalog.name} to ${result.email}. Invite sent — they finish sign-up, then see it on their dashboard.`
          : `Moved ${catalog.name} to ${result.email}. They see it on their dashboard; the previous owner does not.`,
      );
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101720]/40 p-3 sm:items-center">
      <div role="dialog" aria-labelledby="ops-transfer-title" className="w-full max-w-md rounded-[16px] border border-[var(--cat-border)] bg-white p-5 shadow-lg">
        <h2 id="ops-transfer-title" className="m-0 text-[17px] font-semibold tracking-tight text-[var(--cat-ink)]">
          Transfer {catalog.name}
        </h2>
        <p className={`${dashHint} mt-1.5`}>
          Switches <code className="text-[12px]">account_id</code>. Items, orders, reservations, floor and settings stay on this catalog. Type{" "}
          <strong>{catalog.slug}</strong> or <strong>transfer</strong> to confirm.
        </p>
        {done ? (
          <div className="mt-4">
            <p className="text-[13px] leading-relaxed text-[var(--cat-ink)]">{done}</p>
            <button type="button" onClick={onClose} className={`${dashBtnPrimary} mt-4 w-full`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#5a6472]">Customer email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@shop.com"
                className={dashInput}
              />
              <span className={`${dashHint} mt-1.5 block`}>
                Existing login is linked. No account yet — we send an invite and attach the shop.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#5a6472]">Type {catalog.slug} or transfer</span>
              <input
                type="text"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                className={dashInput}
              />
            </label>
            {error ? <p className="text-[13px] text-[#b2432b]">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={`${dashBtnGhost} flex-1`} disabled={pending}>
                Cancel
              </button>
              <button type="submit" className={`${dashBtnPrimary} flex-1`} disabled={pending}>
                {pending ? "Moving…" : "Transfer catalog"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function GrantDialog({ user, onClose }: { user: OpsUserRow; onClose: () => void }) {
  const router = useRouter();
  const [comp, setComp] = useState(user.comp);
  const [maxCatalogs, setMaxCatalogs] = useState(user.maxCatalogs == null ? "" : String(user.maxCatalogs));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user.accountId) {
      setError("This login has no company account yet.");
      return;
    }
    setError(null);
    const raw = maxCatalogs.trim();
    const parsed = raw === "" ? null : Number(raw);
    if (raw && (!Number.isFinite(parsed) || (parsed ?? 0) < 0)) {
      setError("Leave max catalogs blank for unlimited, or enter a number.");
      return;
    }
    start(async () => {
      const result = await grantAccountPlan({
        accountId: user.accountId!,
        comp,
        maxCatalogs: parsed,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      setDone(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101720]/40 p-3 sm:items-center">
      <div role="dialog" aria-labelledby="ops-grant-title" className="w-full max-w-md rounded-[16px] border border-[var(--cat-border)] bg-white p-5 shadow-lg">
        <h2 id="ops-grant-title" className="m-0 text-[17px] font-semibold tracking-tight text-[var(--cat-ink)]">
          Grant {user.email || "this account"}
        </h2>
        <p className={`${dashHint} mt-1.5`}>
          Comp keeps their public shop live without Lemon. Max catalogs is optional — blank means unlimited on this grant.
        </p>
        {done ? (
          <div className="mt-4">
            <p className="text-[13px] leading-relaxed text-[var(--cat-ink)]">Saved.</p>
            <button type="button" onClick={onClose} className={`${dashBtnPrimary} mt-4 w-full`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <label className="flex items-start gap-2.5 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3 py-2.5">
              <input
                type="checkbox"
                checked={comp}
                onChange={(event) => setComp(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-[13px] font-medium text-[var(--cat-ink)]">Comp / free</span>
                <span className={`${dashHint} mt-0.5 block`}>Shop stays live. No Lemon subscription required.</span>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#5a6472]">Max catalogs</span>
              <input
                type="number"
                min={0}
                step={1}
                value={maxCatalogs}
                onChange={(event) => setMaxCatalogs(event.target.value)}
                placeholder="Unlimited"
                className={dashInput}
              />
            </label>
            {error ? <p className="text-[13px] text-[#b2432b]">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={`${dashBtnGhost} flex-1`} disabled={pending}>
                Cancel
              </button>
              <button type="submit" className={`${dashBtnPrimary} flex-1`} disabled={pending}>
                {pending ? "Saving…" : "Save grant"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
