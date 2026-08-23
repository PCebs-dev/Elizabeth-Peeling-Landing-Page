import { redirect } from "next/navigation";

/** Root URL forwards to the studio app shell. */
export default function HomePage() {
  redirect("/studio");
}
