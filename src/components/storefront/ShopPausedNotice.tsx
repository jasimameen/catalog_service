import { StorefrontNotice } from "./StorefrontNotice";

export function ShopPausedNotice({ name, accent }: { name?: string; accent?: string }) {
  const shop = name?.trim();
  return (
    <StorefrontNotice
      title="This shop is paused"
      body={
        shop
          ? `${shop} isn’t taking orders right now. If this is your shop, subscribe again from the dashboard.`
          : "This shop isn’t taking orders right now. If this is your shop, subscribe again from the dashboard."
      }
      accent={accent}
    />
  );
}
