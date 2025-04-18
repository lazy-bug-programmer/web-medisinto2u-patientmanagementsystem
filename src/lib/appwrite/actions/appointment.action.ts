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

export async function exportAppointmentsToExcel(): Promise<{
    success?: string;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any[];
}> {
    try {
        const client = await createAdminClient();

        // Get all appointments without pagination
        const appointments = await client.databases.listDocuments('Core', 'Appointments', []);

        // Create a mapping of patient IDs to patient names for lookup
        const patientIds = appointments.documents.map(app => app.patient_id).filter(Boolean);
        const patientMap = new Map();

        // Fetch patient data in batches if there are many patients
        if (patientIds.length > 0) {
            const uniquePatientIds = [...new Set(patientIds)];

            for (const patientId of uniquePatientIds) {
                try {
                    const patientData = await client.databases.getDocument('Core', 'Patients', patientId);
                    patientMap.set(patientId, patientData.name);
                } catch (err) {
                    console.error(`Error fetching patient ${patientId}:`, err);
                    patientMap.set(patientId, "Unknown");
                }
            }
        }

        // Format data for Excel export
        const formattedData = appointments.documents.map(appointment => {
            const patientName = patientMap.get(appointment.patient_id) || "Unknown";

            let appointmentType = "Unknown";
            if (appointment.type === 1) appointmentType = "Medical Checkup";
            if (appointment.type === 2) appointmentType = "Consultation";

            let admissionType = "Unknown";
            if (appointment.admission_type === 1) admissionType = "Walk-in";
            if (appointment.admission_type === 2) admissionType = "Day Care";
            if (appointment.admission_type === 3) admissionType = "Overnight";

            let status = "Unknown";
            if (appointment.status === 0) status = "Pending";
            if (appointment.status === 1) status = "Confirmed";
            if (appointment.status === 2) status = "Cancelled";
            if (appointment.status === 3) status = "Completed";

            return {
                PatientName: patientName,
                AppointmentType: appointmentType,
                AdmissionType: admissionType,
                Date: new Date(appointment.datetime).toLocaleDateString(),
                Time: new Date(appointment.datetime).toLocaleTimeString(),
                Doctor: appointment.doctor || "Not Assigned",
                Status: status,
                CreatedAt: new Date(appointment.$createdAt).toLocaleString(),
                LastUpdated: new Date(appointment.$updatedAt).toLocaleString()
            };
        });

        return {
            success: "Appointments data prepared for export",
            data: formattedData
        };
    } catch (error) {
        console.error("Error preparing appointments data for export:", error);
        return {
            error: "Error preparing appointments data for export"
        };
    }
}