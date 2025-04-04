import { redirect } from "next/navigation";

export default async function Dashboard() {
  redirect("/dashboard/patients");

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-600"></div>
        <p className="text-lg font-medium text-gray-700">
          Redirecting to patients...
        </p>
      </div>
    </div>
  );
}
