import { redirect } from "next/navigation";

// Legacy route — the dashboard lives on the home page for logged-in users.
export default function DashboardRedirect() {
    redirect("/");
}
