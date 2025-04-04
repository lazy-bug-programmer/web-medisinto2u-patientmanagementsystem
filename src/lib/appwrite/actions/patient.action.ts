"use server"

import { Patient } from "@/lib/domains/patients.domain";
import { createAdminClient } from "../server";
import { uuidv4 } from "@/lib/guid";
import { Models, Query } from "node-appwrite";

export async function getPatients(
    name: string,
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

        const queries = [
            Query.contains("name", name),
            Query.limit(limit),
            Query.offset(offset)
        ];

        const patients = await client.databases.listDocuments('Core', 'Patients', queries);

        const totalPages = Math.ceil(patients.total / limit);

        return {
            success: "Get Patients successfully",
            data: patients.documents,
            total: patients.total,
            totalPages: totalPages
        }
    } catch {
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