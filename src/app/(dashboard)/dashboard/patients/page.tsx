"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPatients,
  deletePatient,
} from "@/lib/appwrite/actions/patient.action";
import { Models } from "node-appwrite";
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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Models.Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rnFilter, setRnFilter] = useState("");
  const [passportFilter, setPassportFilter] = useState("");
  const [dobFilter, setDobFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] =
    useState<Models.Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    async function fetchPatients() {
      setIsLoading(true);
      try {
        const filters = {
          search: searchQuery || "",
          rn: rnFilter || "",
          passport: passportFilter || "",
          dob: dobFilter || "",
        };

        const result = await getPatients(filters, currentPage, limit);

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setPatients(result.data);
          if (result.totalPages) {
            setTotalPages(result.totalPages);
          }
          setError(null);
        }
      } catch (err) {
        setError("Failed to fetch patients");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatients();
  }, [searchQuery, rnFilter, passportFilter, dobFilter, currentPage, limit]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleRnFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRnFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePassportFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassportFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDobFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDobFilter(e.target.value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRnFilter("");
    setPassportFilter("");
    setDobFilter("");
    setCurrentPage(1);
  };

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
  };

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

  const handleDeleteClick = (patient: Models.Document) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deletePatient(patientToDelete.$id);

      if (result.error) {
        toast(result.error);
      } else {
        // Remove patient from the state
        setPatients(patients.filter((p) => p.$id !== patientToDelete.$id));
        toast("Patient deleted successfully");
      }
    } catch (err) {
      toast("Failed to delete patient");
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-2">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Button>
          <Link href={"/dashboard/patients/new"} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="px-4 sm:px-6 py-4">
          <CardTitle>Patient Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col border-b px-4 sm:px-6 py-4 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 w-full max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients by name..."
                  className="h-9 border-none shadow-none focus-visible:ring-0"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFilterVisibility}
                className="whitespace-nowrap"
              >
                {isFilterVisible ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {isFilterVisible && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Registration Number
                  </label>
                  <Input
                    placeholder="Filter by RN"
                    value={rnFilter}
                    onChange={handleRnFilter}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Passport Number
                  </label>
                  <Input
                    placeholder="Filter by passport"
                    value={passportFilter}
                    onChange={handlePassportFilter}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={dobFilter}
                    onChange={handleDobFilter}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full sm:w-auto"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex justify-center items-center p-4 text-red-500">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading patients...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Gender
                    </TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Date of Birth
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Insurance Plan
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Insurance Agent
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">RN</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Passport
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    patients.map((patient) => (
                      <TableRow key={patient.$id}>
                        <TableCell className="font-medium">
                          {patient.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.gender === 1 ? "Male" : "Female"}
                        </TableCell>
                        <TableCell>{patient.age}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {new Date(patient.date_of_birth).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {patient.insurance_plan || "-"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {patient.insurance_agent || "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {patient.rn}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.passport_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/dashboard/patients/${patient.$id}`}>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteClick(patient)}
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
              {patients.length > 0 && (
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
              This action will permanently delete the patient record for{" "}
              <span className="font-semibold">{patientToDelete?.name}</span>.
              This action cannot be undone.
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
