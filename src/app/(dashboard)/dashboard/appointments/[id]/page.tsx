/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { getPatients } from "@/lib/appwrite/actions/patient.action";
import {
  getAppointment,
  updateAppointment,
} from "@/lib/appwrite/actions/appointment.action";
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

export default function AppointmentEditPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Models.Document[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Patient search states
  const [nameSearch, setNameSearch] = useState("");
  const [rnSearch, setRnSearch] = useState("");
  const [passportSearch, setPassportSearch] = useState("");
  const [dobSearch, setDobSearch] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Default form values
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: "",
      type: undefined,
      admission_type: undefined,
      datetime: "",
      doctor: "",
      status: AppointmentStatus.PENDING,
    },
  });

  // Function to handle search with debounce for any field
  const handleSearch = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: string
  ) => {
    setter(value);

    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set a new timeout to fetch patients after 300ms
    const timeout = setTimeout(() => {
      const filters: any = {};

      if (nameSearch) filters.search = nameSearch;
      if (rnSearch) filters.rn = rnSearch;
      if (passportSearch) filters.passport = passportSearch;
      if (dobSearch) filters.dob = dobSearch;

      // Update the field that just changed
      if (field === "name") filters.search = value;
      if (field === "rn") filters.rn = value;
      if (field === "passport") filters.passport = value;
      if (field === "dob") filters.dob = value;

      fetchPatients(filters);
    }, 300);

    setDebounceTimeout(timeout);
  };

  // Function to fetch patients with search filters
  const fetchPatients = async (filters: any) => {
    setIsLoadingPatients(true);
    try {
      const result = await getPatients(filters, 1, 100);
      if (result.data) {
        setPatients(result.data);
      }
    } catch (error) {
      console.error("Failed to load patients:", error);
      toast("Failed to load patients. Please try again.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setNameSearch("");
    setRnSearch("");
    setPassportSearch("");
    setDobSearch("");
    fetchPatients({});
  };

  // Fetch appointment data and patients on component mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Get appointment data
        const appointmentResult = await getAppointment(appointmentId);
        if (appointmentResult.error) {
          setError(appointmentResult.error);
          return;
        }

        if (!appointmentResult.data) {
          setError("Appointment not found");
          return;
        }

        const appointment = appointmentResult.data;

        // Format datetime for the form
        const appointmentDate = new Date(appointment.datetime);
        const formattedDate = appointmentDate.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM

        // Set form values
        form.reset({
          patient_id: appointment.patient_id,
          type: appointment.type,
          admission_type: appointment.admission_type,
          datetime: formattedDate,
          doctor: appointment.doctor,
          status: appointment.status,
        });

        // Load patients list
        fetchPatients({});
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load appointment data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Clean up timeout on unmount
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [appointmentId, form]);

  async function onSubmit(data: AppointmentFormValues) {
    setIsSubmitting(true);
    try {
      // Format the datetime to a Date object
      const formattedData = {
        ...data,
        datetime: new Date(data.datetime),
      };

      const result = await updateAppointment(appointmentId, formattedData);

      if (result.error) {
        toast(result.error);
      } else {
        toast("Appointment updated successfully");
        router.push("/dashboard/appointments");
      }
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading appointment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => router.push("/dashboard/appointments")}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-2">
        <h2 className="text-2xl font-bold">Edit Appointment</h2>
      </div>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          <CardDescription>Edit the appointment information</CardDescription>
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Patient Search
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setIsSearchExpanded(!isSearchExpanded)
                            }
                            className="h-8 text-xs"
                          >
                            {isSearchExpanded
                              ? "Simple Search"
                              : "Advanced Search"}
                          </Button>
                        </div>

                        {!isSearchExpanded ? (
                          // Simple search - just name
                          <Input
                            placeholder="Search by name"
                            value={nameSearch}
                            onChange={(e) =>
                              handleSearch(
                                e.target.value,
                                setNameSearch,
                                "name"
                              )
                            }
                            className="h-9"
                          />
                        ) : (
                          // Advanced search - multiple fields
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <div>
                              <label className="text-xs mb-1 block">Name</label>
                              <Input
                                placeholder="Search by name"
                                value={nameSearch}
                                onChange={(e) =>
                                  handleSearch(
                                    e.target.value,
                                    setNameSearch,
                                    "name"
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block">
                                Registration Number
                              </label>
                              <Input
                                placeholder="Search by RN"
                                value={rnSearch}
                                onChange={(e) =>
                                  handleSearch(
                                    e.target.value,
                                    setRnSearch,
                                    "rn"
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block">
                                Passport
                              </label>
                              <Input
                                placeholder="Search by passport"
                                value={passportSearch}
                                onChange={(e) =>
                                  handleSearch(
                                    e.target.value,
                                    setPassportSearch,
                                    "passport"
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block">
                                Date of Birth
                              </label>
                              <Input
                                type="date"
                                value={dobSearch}
                                onChange={(e) =>
                                  handleSearch(
                                    e.target.value,
                                    setDobSearch,
                                    "dob"
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 text-xs w-full"
                              >
                                Clear Filters
                              </Button>
                            </div>
                          </div>
                        )}

                        {isLoadingPatients && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            Searching...
                          </div>
                        )}

                        <FormControl>
                          <Select
                            disabled={isLoadingPatients}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a patient" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {patients.length === 0 ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">
                                  No patients found
                                </div>
                              ) : (
                                patients.map((patient) => (
                                  <SelectItem
                                    key={patient.$id}
                                    value={patient.$id}
                                  >
                                    {patient.name} - {patient.rn}
                                    {patient.passport_number &&
                                      ` - Passport: ${patient.passport_number}`}
                                    {patient.phone1 &&
                                      ` - Phone: ${patient.phone1}`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
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
                          value={field.value?.toString()}
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
                          value={field.value?.toString()}
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
                            <SelectItem
                              value={AppointmentAdmissionType.OVERNIGHT.toString()}
                            >
                              Overnight
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
                          value={field.value?.toString()}
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
                Update Appointment
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
