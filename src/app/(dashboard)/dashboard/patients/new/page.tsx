"use client";

import Link from "next/link";
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
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { createPatient } from "@/lib/appwrite/actions/patient.action";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

// Function to calculate age from date of birth
const calculateAge = (birthday: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDifference = today.getMonth() - birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthday.getDate())
  ) {
    age--;
  }

  return age;
};

const patientFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  passport_number: z.string().min(1, "Passport number is required"),
  date_of_birth: z.date(),
  gender: z.enum(["male", "female", "other"]),
  rn: z.string().min(1, "Registration number is required"),
  phone1: z.string().min(1, "Primary phone number is required"),
  phone2: z.string().optional(),
  patient_type: z.enum(["normal", "insurance"]),
  insurance_agent: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      passport_number: "",
      gender: undefined,
      date_of_birth: new Date(),
      rn: "",
      phone1: "",
      phone2: "",
      patient_type: "normal",
      insurance_agent: "",
    },
  });

  async function onSubmit(values: PatientFormValues) {
    setIsSubmitting(true);
    try {
      // Prepare data for API
      const fullName = values.name;
      const age = calculateAge(values.date_of_birth);

      const patientData = {
        name: fullName,
        age: age,
        gender:
          values.gender === "male" ? 1 : values.gender === "female" ? 2 : 3,
        date_of_birth: values.date_of_birth,
        rn: values.rn,
        passport_number: values.passport_number,
        phone1: values.phone1,
        phone2: values.phone2 || "",
        insurance_plan: values.patient_type === "insurance" ? "Yes" : "No",
        insurance_agent: values.insurance_agent || "",
      };

      const result = await createPatient(patientData);

      if (result.error) {
        toast(result.error);
      } else {
        toast(result.success);
        router.push("/dashboard/patients");
      }
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get the current date of birth value for displaying calculated age
  const dateOfBirth = form.watch("date_of_birth");
  const calculatedAge = dateOfBirth ? calculateAge(dateOfBirth) : 0;

  // Show insurance agent field only when patient has insurance
  const patientType = form.watch("patient_type");

  return (
    <>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link href="/dashboard/patients">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">New Patient</h2>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Patient Registration</CardTitle>
          <CardDescription>
            Enter patient details to create a new record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 1. Full Name */}
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

              {/* 2. Passport Number */}
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

              {/* 3. Date of Birth */}
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value ? format(field.value, "yyyy-MM-dd") : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4. Age and Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Age (Calculated)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={calculatedAge}
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Registration Number */}
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

              {/* Phone numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter primary phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Secondary Phone{" "}
                        <span className="text-sm text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter secondary phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 5. Patient Type (Normal/Insurance) */}
              <FormField
                control={form.control}
                name="patient_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal Patient</SelectItem>
                        <SelectItem value="insurance">
                          With Insurance
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 6. Insurance Agent - Only show if patient has insurance */}
              {patientType === "insurance" && (
                <FormField
                  control={form.control}
                  name="insurance_agent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Agent</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter insurance agent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <CardFooter className="flex justify-end gap-2 px-0 flex-col sm:flex-row">
                <Link href="/dashboard/patients" className="w-full sm:w-auto">
                  <Button variant="outline" type="button" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Registering..." : "Register Patient"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
