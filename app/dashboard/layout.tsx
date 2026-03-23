import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
          LeadSync
        </Link>
        <UserButton />
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
