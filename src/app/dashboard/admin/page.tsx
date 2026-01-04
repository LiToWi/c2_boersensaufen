import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";

export default async function UserDashboardPage() {
    const session = await getServerSession(authOptions);

    // only allow the admin account (adjust check if your admin identifier differs)
    if (!session) {
        // send non-admins to sign in (or change to a 403 page)
        redirect("/login");
    }
    if (session.user?.name !== "admin") {
        redirect("/dashboard/user");
    }

    return (
        <div>
            <h1>Admin Dashboard</h1>
        </div>
    );
}