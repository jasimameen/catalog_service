"use client";

import { useActionState } from "react";
import type { AccountRow } from "@/lib/supabase/types";
import { updateCompany, updateNotifications, type SettingsState } from "./actions";

export function NotificationsForm({ account }: { account: AccountRow }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateNotifications, null);

  return (
    <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
      <h3 className="m-0 mb-4 text-[15px] font-semibold text-[var(--cat-ink)]">Order notifications</h3>
      <form action={formAction} className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Email orders to</label>
          <input
            name="order_email"
            type="email"
            defaultValue={account.order_email ?? ""}
            placeholder="orders@yourcompany.com"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Copy to</label>
          <input
            name="order_email_cc"
            type="email"
            defaultValue={account.order_email_cc ?? ""}
            placeholder="sales@yourcompany.com"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>
        {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
        {state?.saved ? <p className="m-0 text-xs text-[#1e9e4a]">Saved.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[10px] bg-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

export function CompanyForm({ account, email }: { account: AccountRow; email: string }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateCompany, null);

  return (
    <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
      <h3 className="m-0 mb-4 text-[15px] font-semibold text-[var(--cat-ink)]">Company</h3>
      <form action={formAction} className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1 block text-xs text-[#86868b]">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            className="w-full cursor-default rounded-[10px] border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-2 text-[13px] text-[var(--cat-ink)] outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Company name</label>
            <input
              name="name"
              defaultValue={account.name}
              required
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Currency</label>
            <input
              name="currency"
              defaultValue={account.currency}
              required
              maxLength={6}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] uppercase outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
        </div>
        {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
        {state?.saved ? <p className="m-0 text-xs text-[#1e9e4a]">Saved.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[10px] bg-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
