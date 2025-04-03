"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getPatients } from "@/lib/appwrite/actions/patient.action";
import { createAppointment } from "@/lib/appwrite/actions/appointment.action";
import { Models } from "node-appwrite";
import {
  AppointmentType,
  AppointmentAdmissionType,
  AppointmentStatus,
} from "@/lib/domains/appointments.domain";
import { toast } from "sonner";

// Create zod schema for appointment form
const appointmentFormSchema = z.object({
  patient_id: z.string().min(1, "Patient is required"),
  type: z.coerce.number().int().min(1, "Appointment type is required"),
  admission_type: z.coerce.number().int().min(1, "Admission type is required"),
  datetime: z.string().min(1, "Date and time is required"),
  doctor: z.string().min(1, "Doctor name is required"),
  status: z.coerce.number().int(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function NewAppointmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Models.Document[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Default values for the form
  const defaultValues: Partial<AppointmentFormValues> = {
    status: AppointmentStatus.PENDING,
  };

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues,
  });

  // Fetch patients on component mount
  useEffect(() => {
    async function loadPatients() {
      setIsLoadingPatients(true);
      try {
        const result = await getPatients("", 1, 10000);
        if (result.data) {
          setPatients(result.data);
        }
      } catch (error) {
        console.error("Failed to load patients:", error);
        toast("Failed to load patients. Please try again.");
      } finally {
        setIsLoadingPatients(false);
      }
    }

    loadPatients();
  }, []);

  async function onSubmit(data: AppointmentFormValues) {
    setIsSubmitting(true);
    try {
      // Format the datetime to a Date object
      const formattedData = {
        ...data,
        datetime: new Date(data.datetime),
      };

      const result = await createAppointment(formattedData);

      if (result.error) {
        toast(result.error);
      } else {
        toast("Appointment created successfully");
        router.push("/dashboard/appointments");
      }
    } catch (error) {
      console.error("Failed to create appointment:", error);
      toast("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-2">
        <h2 className="text-2xl font-bold">New Appointment</h2>
      </div>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          <CardDescription>
            Create a new appointment for a patient
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <FormControl>
                        <Select
                          disabled={isLoadingPatients}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingPatients ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading patients...
                              </div>
                            ) : patients.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                No patients found
                              </div>
                            ) : (
                              patients.map((patient) => (
                                <SelectItem
                                  key={patient.$id}
                                  value={patient.$id}
                                >
                                  {patient.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={AppointmentType.MEDICAL_CHECKUP.toString()}
                            >
                              Medical Checkup
                            </SelectItem>
                            <SelectItem
                              value={AppointmentType.CONSULTATION.toString()}
                            >
                              Consultation
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admission_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select admission type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={AppointmentAdmissionType.WALK_IN.toString()}
                            >
                              Walk-in
                            </SelectItem>
                            <SelectItem
                              value={AppointmentAdmissionType.DAY_CARE.toString()}
                            >
                              Day Care
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={AppointmentStatus.PENDING.toString()}
                            >
                              Pending
                            </SelectItem>
                            <SelectItem
                              value={AppointmentStatus.CONFIRMED.toString()}
                            >
                              Confirmed
                            </SelectItem>
                            <SelectItem
                              value={AppointmentStatus.CANCELLED.toString()}
                            >
                              Cancelled
                            </SelectItem>
                            <SelectItem
                              value={AppointmentStatus.COMPLETED.toString()}
                            >
                              Completed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push("/dashboard/appointments")}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Appointment
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
