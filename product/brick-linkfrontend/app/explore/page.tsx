import { redirect } from "next/navigation";

// The hosted Preview uses prepared builds; the live explorer requires a local
// Python/LeoCAD backend. Keep visitors in the working Preview experience.
export default function Explore() {
  redirect("/");
}
