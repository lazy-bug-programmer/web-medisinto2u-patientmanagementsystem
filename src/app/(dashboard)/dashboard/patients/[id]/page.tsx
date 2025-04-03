"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, CalendarDays } from "lucide-react";
import {
  getPatient,
  updatePatient,
} from "@/lib/appwrite/actions/patient.action";
import { Patient } from "@/lib/domains/patients.domain";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the validation schema using Zod to match Patient domain
const patientFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.number().min(0).max(120),
  gender: z.enum(["1", "2", "3"]),
  date_of_birth: z.date(),
  rn: z.string().min(1, "Registration number is required"),
  passport_number: z.string().min(1, "Passport number is required"),
  insurance_plan: z.string().optional(),
  insurance_agent: z.string().optional(),
});

// Gender constants to match backend values
const GENDER_MALE = "1";
const GENDER_FEMALE = "2";
const GENDER_OTHER = "3";

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const patientId = params.id as string;

  // Initialize the form with React Hook Form
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      age: 0,
      gender: undefined,
      date_of_birth: new Date(),
      rn: "",
      passport_number: "",
      insurance_plan: "",
      insurance_agent: "",
    },
  });

  // Fetch patient data
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) return;

      try {
        const response = await getPatient(patientId);
        if (response.data) {
          const patientData = response.data;

          // Convert gender to string format for the form
          const genderValue = patientData.gender?.toString() as "1" | "2" | "3";
          console.log("Gender value:", genderValue);

          form.setValue("name", patientData.name || "");
          form.setValue("age", patientData.age || 0);
          form.setValue("gender", genderValue);

          if (patientData.date_of_birth) {
            form.setValue("date_of_birth", new Date(patientData.date_of_birth));
          }
          form.setValue("rn", patientData.rn || "");
          form.setValue("passport_number", patientData.passport_number || "");
          form.setValue("insurance_plan", patientData.insurance_plan || "");
          form.setValue("insurance_agent", patientData.insurance_agent || "");
        }
      } catch {
        toast("Failed to fetch patient details");
      }
    };

    fetchPatient();
  }, [patientId, form]);

  // Handle form submission
  async function onSubmit(values: PatientFormValues) {
    setIsLoading(true);

    try {
      // Prepare patient data for update based on domain
      const patientData: Patient = {
        name: values.name,
        age: values.age,
        gender: parseInt(values.gender),
        date_of_birth: values.date_of_birth,
        rn: values.rn,
        passport_number: values.passport_number,
        insurance_agent: values.insurance_agent || "",
        insurance_plan: values.insurance_plan || "",
      };

      const result = await updatePatient(patientId, patientData);

      if (result.success) {
        toast(result.success);
        router.push("/dashboard/patients");
      } else {
        toast(result.error || "Failed to update patient");
      }
    } catch {
      toast("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link href="/dashboard/patients">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">Edit Patient</h2>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Edit patient information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter age"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={GENDER_MALE}>Male</SelectItem>
                          <SelectItem value={GENDER_FEMALE}>Female</SelectItem>
                          <SelectItem value={GENDER_OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number (RN)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter registration number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter passport number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insurance_plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Insurance Plan{" "}
                      <span className="text-sm text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter insurance plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insurance_agent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Insurance Agent{" "}
                      <span className="text-sm text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter insurance agent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="flex justify-end gap-2 px-0 flex-col sm:flex-row">
                <Link href="/dashboard/patients" className="w-full sm:w-auto">
                  <Button variant="outline" type="button" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Updating..." : "Update Patient"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
