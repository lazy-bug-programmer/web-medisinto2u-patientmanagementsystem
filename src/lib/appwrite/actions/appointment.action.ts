"use server"

import { createAdminClient } from "../server";
import { uuidv4 } from "@/lib/guid";
import { Models, Query } from "node-appwrite";
import { Appointment } from "@/lib/domains/appointments.domain";

export async function getAppointments(
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
            Query.limit(limit),
            Query.offset(offset)
        ];

        const appointments = await client.databases.listDocuments('Core', 'Appointments', queries);

        const totalPages = Math.ceil(appointments.total / limit);

        return {
            success: "Get Appointments successfully",
            data: appointments.documents,
            total: appointments.total,
            totalPages: totalPages
        }
    } catch {
        return {
            error: "Error getting Appointments"
        }
    }
}

export async function getAppointment(id: string): Promise<{
    success?: string;
    error?: string;
    data?: Models.Document;
}> {
    try {
        const client = await createAdminClient();
        const appointment = await client.databases.getDocument('Core', 'Appointments', id);

        return {
            success: "Get Appointment successfully",
            data: appointment
        }
    } catch {
        return {
            error: "Error getting Appointment"
        }
    }
}

export async function createAppointment(data: Appointment): Promise<{ success?: string; error?: string }> {
    console.log(data)

    try {
        const client = await createAdminClient();
        await client.databases.createDocument('Core', 'Appointments', uuidv4(), data);

        return {
            success: "Create Appointment successfully"
        }
    } catch {
        return {
            error: "Error creating Appointment"
        }
    }
}

export async function updateAppointment(id: string, data: Appointment): Promise<{ success?: string; error?: string }> {
    try {
        const client = await createAdminClient();
        await client.databases.updateDocument('Core', 'Appointments', id, data);

        return {
            success: "Update Appointment successfully"
        }
    } catch {
        return {
            error: "Error updating Appointment"
        }
    }
}

export async function deleteAppointment(id: string): Promise<{ success?: string; error?: string }> {
    try {
        const client = await createAdminClient();
        await client.databases.deleteDocument('Core', 'Appointments', id);

        return {
            success: "Delete Appointment successfully"
        }
    } catch {
        return {
            error: "Error deleting Appointment"
        }
    }
}