import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ClipboardList } from "lucide-react";
import { getPatients } from "@/lib/appwrite/actions/patient.action";
import { getAppointments } from "@/lib/appwrite/actions/appointment.action";
import { AppointmentType } from "@/lib/domains/appointments.domain";
import Link from "next/link";

export default async function Dashboard() {
  // Fetch patients
  const patientsResponse = await getPatients("", 1, 1000); // Get all patients for count
  const newPatientsResponse = await getPatients("", 1, 4); // Get recent patients for display

  // Fetch appointments
  const appointmentsResponse = await getAppointments(1, 5); // Get recent appointments
  const upcomingCheckupsResponse = await getAppointments(1, 1000); // Get all for filtering checkups

  // Count upcoming checkups
  const upcomingCheckups =
    upcomingCheckupsResponse.data?.filter((appointment) => {
      const appointmentDate = new Date(appointment.datetime);
      const currentDate = new Date();

      // Get end of current week (next Sunday)
      const endOfWeek = new Date(currentDate);
      endOfWeek.setDate(currentDate.getDate() + (7 - currentDate.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);

      // Check if it's a medical checkup AND it's in the future AND it's within this week
      return (
        appointment.type === AppointmentType.MEDICAL_CHECKUP &&
        appointmentDate > currentDate &&
        appointmentDate <= endOfWeek
      );
    }).length || 0;

  // Function to get appointment type name
  const getAppointmentTypeName = (type: number) => {
    switch (type) {
      case AppointmentType.MEDICAL_CHECKUP:
        return "Medical Checkup";
      case AppointmentType.CONSULTATION:
        return "Consultation";
      default:
        return "Unknown";
    }
  };

  // Function to get patient name by ID (using patient_id from appointment)
  const getPatientName = (patientId: string) => {
    const patient = patientsResponse.data?.find((p) => p.$id === patientId);
    return patient ? patient.name : "Unknown Patient";
  };

  return (
    <div className="p-1 sm:p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientsResponse.total || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Medical Checkups
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCheckups}</div>
            <p className="text-xs text-muted-foreground">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>
              Showing the last {appointmentsResponse.data?.length || 0}{" "}
              appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="space-y-4 overflow-x-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 text-sm text-muted-foreground">
                <div>Patient</div>
                <div className="hidden sm:block">Type</div>
                <div className="hidden sm:block">Doctor</div>
                <div>Date & Time</div>
              </div>

              {appointmentsResponse.data &&
              appointmentsResponse.data.length > 0 ? (
                appointmentsResponse.data.map((appointment) => (
                  <div
                    key={appointment.$id}
                    className="grid grid-cols-2 sm:grid-cols-4 items-center gap-2 sm:gap-4 rounded-lg border p-2 sm:p-4"
                  >
                    <div className="font-medium">
                      {getPatientName(appointment.patient_id)}
                    </div>
                    <div className="hidden sm:block">
                      {getAppointmentTypeName(appointment.type)}
                    </div>
                    <div className="hidden sm:block">{appointment.doctor}</div>
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      {new Date(appointment.datetime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No appointments found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-3">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>New Patients</CardTitle>
            <CardDescription>Recently registered patients</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="space-y-4">
              {newPatientsResponse.data &&
              newPatientsResponse.data.length > 0 ? (
                newPatientsResponse.data.map((patient) => (
                  <div
                    key={patient.$id}
                    className="flex items-center gap-2 sm:gap-4 rounded-lg border p-2 sm:p-4"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {patient.age} years •{" "}
                        {patient.gender === 1
                          ? "Male"
                          : patient.gender === 2
                          ? "Female"
                          : "Other"}
                      </div>
                    </div>
                    <Link href={`/dashboard/patients/${patient.$id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No new patients
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
