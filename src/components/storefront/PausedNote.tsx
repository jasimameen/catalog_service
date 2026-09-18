import { StorefrontMarquee } from "./StorefrontMarquee";

export function PausedNote({ message }: { message: string }) {
  return <StorefrontMarquee text={message} tone="soft" />;
}