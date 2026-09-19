import { redirect } from "next/navigation";
import { HARBOR_LIVE_PATH } from "@/lib/catalog/demo-harbor";

export default function DemoRedirectPage() {
  redirect(HARBOR_LIVE_PATH);
}
