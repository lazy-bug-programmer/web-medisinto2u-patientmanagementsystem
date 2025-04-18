"use server"

import { Patient } from "@/lib/domains/patients.domain";
import { createAdminClient } from "../server";
import { uuidv4 } from "@/lib/guid";
import { Models, Query } from "node-appwrite";

// Update the function parameters to accept filter object
export async function getPatients(
    filters: {
        search?: string;
        rn?: string;
        passport?: string;
        dob?: string;
    } = {},
    page: number = 1,
    limit: number = 10
): Promise<{
    success?: string;
    error?: string;
    data?: Models.Document[];
    total?: number;
    totalPages?: number;
}> {
    try {
        const client = await createAdminClient();

        const offset = (page - 1) * limit;

        // Build queries based on filters
        const queries = [
            Query.limit(limit),
            Query.offset(offset)
        ];

        // Add name filter if provided
        if (filters.search) {
            queries.push(Query.contains("name", filters.search));
        }

        // Add RN filter if provided
        if (filters.rn) {
            queries.push(Query.contains("rn", filters.rn));
        }

        // Add passport filter if provided
        if (filters.passport) {
            queries.push(Query.contains("passport_number", filters.passport));
        }

        // Add date of birth filter if provided
        if (filters.dob) {
            // For date filters, we need exact match since dates are stored in ISO format
            // Convert the input date to the same format as stored in the database
            const dateObj = new Date(filters.dob);
            if (!isNaN(dateObj.getTime())) {
                const isoDate = dateObj.toISOString().split('T')[0];
                queries.push(Query.search("date_of_birth", isoDate));
            }
        }

        const patients = await client.databases.listDocuments('Core', 'Patients', queries);

        const totalPages = Math.ceil(patients.total / limit);

        return {
            success: "Get Patients successfully",
            data: patients.documents,
            total: patients.total,
            totalPages: totalPages
        }
    } catch (error) {
        console.error("Error fetching patients:", error);
        return {
            error: "Error getting Patients"
        }
    }
}

export async function getPatient(id: string): Promise<{
    success?: string;
    error?: string;
    data?: Models.Document;
}> {
    try {
        const client = await createAdminClient();
        const patient = await client.databases.getDocument('Core', 'Patients', id);

        return {
            success: "Get Patient successfully",
            data: patient
        }
    } catch {
        return {
            error: "Error getting Patient"
        }
    }
}

export async function createPatient(data: Patient): Promise<{ success?: string; error?: string }> {
    const client = await createAdminClient();
    await client.databases.createDocument('Core', 'Patients', uuidv4(), data);

    return {
        success: "Create Patient successfully"
    }
}

export async function updatePatient(id: string, data: Patient): Promise<{ success?: string; error?: string }> {
    try {
        const client = await createAdminClient();
        await client.databases.updateDocument('Core', 'Patients', id, data);

        return {
            success: "Update Patient successfully"
        }
    } catch {
        return {
            error: "Error updating Patient"
        }
    }
}

export async function deletePatient(id: string): Promise<{ success?: string; error?: string }> {
    try {
        const client = await createAdminClient();
        await client.databases.deleteDocument('Core', 'Patients', id);

        return {
            success: "Delete Patient successfully"
        }
    } catch {
        return {
            error: "Error deleting Patient"
        }
    }
}