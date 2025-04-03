"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAppointments,
  deleteAppointment,
} from "@/lib/appwrite/actions/appointment.action";
import { getPatient } from "@/lib/appwrite/actions/patient.action";
import { Models } from "node-appwrite";
import {
  AppointmentType,
  AppointmentAdmissionType,
  AppointmentStatus,
} from "@/lib/domains/appointments.domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Define type for appointment with patient data
interface AppointmentWithPatient extends Models.Document {
  patientData?: {
    name: string;
  } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<AppointmentWithPatient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    async function fetchAppointments() {
      setIsLoading(true);
      try {
        const result = await getAppointments(currentPage, limit);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          // Store the appointments initially without patient data
          const appointmentsData = result.data as AppointmentWithPatient[];
          setAppointments(appointmentsData);

          if (result.totalPages) {
            setTotalPages(result.totalPages);
          }

          // Fetch patient data for each appointment
          for (const appointment of appointmentsData) {
            if (appointment.patient_id) {
              const patientResult = await getPatient(appointment.patient_id);
              if (patientResult.data) {
                // Update the appointment with patient data
                setAppointments((prev) =>
                  prev.map((app) =>
                    app.$id === appointment.$id
                      ? {
                          ...app,
                          patientData: {
                            name: patientResult.data?.name || "Unknown",
                          },
                        }
                      : app
                  )
                );
              }
            }
          }

          setError(null);
        }
      } catch (err) {
        setError("Failed to fetch appointments");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppointments();
  }, [currentPage, limit]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const getAppointmentTypeName = (type: number) => {
    return type === AppointmentType.MEDICAL_CHECKUP
      ? "Medical Checkup"
      : "Consultation";
  };

  const getAdmissionTypeName = (type: number) => {
    return type === AppointmentAdmissionType.WALK_IN ? "Walk-in" : "Day care";
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-600 border-green-200">
            Confirmed
          </div>
        );
      case AppointmentStatus.PENDING:
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-600 border-yellow-200">
            Pending
          </div>
        );
      case AppointmentStatus.CANCELLED:
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-600 border-red-200">
            Cancelled
          </div>
        );
      case AppointmentStatus.COMPLETED:
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-600 border-blue-200">
            Completed
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-50 text-gray-600 border-gray-200">
            Unknown
          </div>
        );
    }
  };

  const handleDeleteClick = (appointment: AppointmentWithPatient) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAppointment(appointmentToDelete.$id);

      if (result.error) {
        toast(result.error);
      } else {
        // Remove appointment from the state
        setAppointments(
          appointments.filter((a) => a.$id !== appointmentToDelete.$id)
        );
        toast("Appointment deleted successfully");
      }
    } catch (err) {
      toast("Failed to delete appointment");
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-2">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <Link href="/dashboard/appointments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader className="px-4 sm:px-6 py-4">
          <CardTitle>Appointment Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="flex justify-center items-center p-4 text-red-500">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading appointments...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Admission
                    </TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Doctor
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    appointments.map((appointment) => (
                      <TableRow key={appointment.$id}>
                        <TableCell className="font-medium">
                          {appointment.patientData?.name ||
                            (appointment.patient_id ? "Loading..." : "Unknown")}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getAppointmentTypeName(appointment.type)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getAdmissionTypeName(appointment.admission_type)}
                        </TableCell>
                        <TableCell>
                          {new Date(appointment.datetime).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {appointment.doctor}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(appointment.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link
                              href={`/dashboard/appointments/${appointment.$id}`}
                            >
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteClick(appointment)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between py-4 px-4 sm:px-6 flex-col sm:flex-row gap-2">
            <div className="text-sm text-muted-foreground">
              {appointments.length > 0 && (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={isLoading || currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={isLoading || currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the appointment for{" "}
              <span className="font-semibold">
                {appointmentToDelete?.patientData?.name || "this patient"}
              </span>{" "}
              scheduled on{" "}
              <span className="font-semibold">
                {appointmentToDelete?.datetime &&
                  new Date(appointmentToDelete.datetime).toLocaleString()}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
