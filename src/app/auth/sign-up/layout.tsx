import type { ReactNode } from "react";
import { SIGNUP_DESCRIPTION, SIGNUP_TITLE, marketingMetadata } from "@/lib/seo/marketing";

export const metadata = marketingMetadata({
  title: SIGNUP_TITLE,
  description: SIGNUP_DESCRIPTION,
  path: "/auth/sign-up",
});

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
