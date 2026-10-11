/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { Patient, PatientGender } from "@/lib/domains/patients.domain";
import { createAdminClient } from "../server";
import { uuidv4 } from "@/lib/guid";
import { Models, Query } from "node-appwrite";

type PatientImportRow = {
    Name?: string;
    RegistrationNumber?: string;
    PassportNumber?: string;
    Gender?: string;
    Age?: string;
    DateOfBirth?: string;
    PrimaryPhone?: string;
    SecondaryPhone?: string;
    InsuranceAgent?: string;
    InsurancePlan?: string;
};

type PatientImportInput = PatientImportRow | string[];

type PatientIdentityIndex = {
    rn: Set<string>;
    passport: Set<string>;
    nameDob: Set<string>;
};

const PATIENT_IMPORT_BATCH_SIZE = 100;

/**
 * Imports patients from CSV data
 * @param patientsData Array of patient data objects
 * @returns Success status and counts
 */
export async function importPatientsFromCSV(patientsData: any[]) {
    try {
        const client = await createAdminClient();
        const databases = client.databases;
        const existingPatients = await loadExistingPatientIdentityIndex(databases);

        // Track successful and failed imports
        let successful = 0;
        let failed = 0;
        let duplicatesSkipped = 0;
        const errors: string[] = [];
        const processedPatients: PatientIdentityIndex = {
            rn: new Set(),
            passport: new Set(),
            nameDob: new Set(),
        };

        // Process each patient
        for (const rawPatient of patientsData as PatientImportInput[]) {
            try {
                const patient = normalizeImportRow(rawPatient);

                // Skip empty rows or rows without key identifiers
                if ((!patient.Name || patient.Name.trim() === '') &&
                    (!patient.RegistrationNumber || patient.RegistrationNumber.trim() === '') &&
                    (!patient.PassportNumber || patient.PassportNumber.trim() === '')) {
                    continue;
                }

                if (isHeaderRow(patient)) {
                    continue;
                }

                const identity = buildPatientIdentity(patient);

                // Skip if this patient already exists in the database or was processed in this upload
                if (isDuplicatePatient(identity, existingPatients, processedPatients)) {
                    duplicatesSkipped++;
                    continue;
                }

                if (identity.rn) {
                    processedPatients.rn.add(identity.rn);
                }

                if (identity.passport) {
                    processedPatients.passport.add(identity.passport);
                }

                if (identity.nameDob) {
                    processedPatients.nameDob.add(identity.nameDob);
                }

                // Parse gender - default to female if not specified
                let gender = 2; // Default to female
                if (patient.Gender) {
                    gender = patient.Gender.toLowerCase().includes('male') ? 1 : 2;
                }

                // Parse age
                let age = null;
                if (patient.Age && !isNaN(parseInt(patient.Age, 10))) {
                    age = parseInt(patient.Age, 10);
                }

                // Clean and validate the date of birth
                let dateOfBirth = null;
                if (patient.DateOfBirth &&
                    patient.DateOfBirth !== 'NEW' &&
                    patient.DateOfBirth !== 'NEW print' &&
                    patient.DateOfBirth !== 'old') {

                    try {
                        const parsedDate = parseDate(patient.DateOfBirth);
                        if (parsedDate) {
                            dateOfBirth = parsedDate.toISOString();
                        }
                    } catch {
                        console.warn(`Could not parse date: ${patient.DateOfBirth}`);
                    }
                }

                // Clean registration number and passport number
                const registrationNumber = patient.RegistrationNumber?.trim() || '';
                const passportNumber = patient.PassportNumber?.trim() || '';

                // Prepare patient data
                const patientData = {
                    name: patient.Name?.trim() || '',
                    gender,
                    age,
                    date_of_birth: dateOfBirth,
                    rn: registrationNumber,
                    passport_number: passportNumber,
                    phone1: patient.PrimaryPhone?.trim() || '',
                    phone2: patient.SecondaryPhone?.trim() || '',
                    insurance_agent: patient.InsuranceAgent?.trim() || '',
                    insurance_plan: patient.InsurancePlan?.trim() || '',
                };

                // Skip patients without a name
                if (!patientData.name) {
                    failed++;
                    continue;
                }

                // Create the patient record
                await databases.createDocument(
                    'Core',
                    'Patients',
                    uuidv4(),
                    patientData
                );

                successful++;
            } catch (err) {
                failed++;
                if (err instanceof Error) {
                    const importLabel = Array.isArray(rawPatient)
                        ? normalizeText(rawPatient[0]) || 'unnamed patient'
                        : normalizeText(rawPatient?.Name) || 'unnamed patient';

                    errors.push(`Error importing ${importLabel}: ${err.message}`);
                    console.error(`Import error for ${importLabel}:`, err);
                }
            }
        }

        return {
            success: true,
            data: {
                successful,
                failed,
                duplicatesSkipped,
                errors: errors.length > 0 ? errors : null
            }
        };
    } catch (error) {
        console.error("Error importing patients:", error);
        return {
            success: false,
            error: "Failed to import patients"
        };
    }
}

async function loadExistingPatientIdentityIndex(databases: Awaited<ReturnType<typeof createAdminClient>>["databases"]): Promise<PatientIdentityIndex> {
    const index: PatientIdentityIndex = {
        rn: new Set(),
        passport: new Set(),
        nameDob: new Set(),
    };

    let offset = 0;

    while (true) {
        const result = await databases.listDocuments('Core', 'Patients', [
            Query.limit(PATIENT_IMPORT_BATCH_SIZE),
            Query.offset(offset),
        ]);

        for (const patient of result.documents) {
            const rn = normalizeIdentityValue(patient.rn);
            const passport = normalizeIdentityValue(patient.passport_number);
            const nameDob = buildNameDobKey(patient.name, patient.date_of_birth);

            if (rn) {
                index.rn.add(rn);
            }

            if (passport) {
                index.passport.add(passport);
            }

            if (nameDob) {
                index.nameDob.add(nameDob);
            }
        }

        if (result.documents.length < PATIENT_IMPORT_BATCH_SIZE) {
            break;
        }

        offset += result.documents.length;
    }

    return index;
}

function buildPatientIdentity(patient: PatientImportRow) {
    const rn = normalizeIdentityValue(patient.RegistrationNumber);
    const passport = normalizeIdentityValue(patient.PassportNumber);
    const nameDob = buildNameDobKey(patient.Name, patient.DateOfBirth);

    return { rn, passport, nameDob };
}

function isDuplicatePatient(
    identity: { rn: string; passport: string; nameDob: string },
    existingPatients: PatientIdentityIndex,
    processedPatients: PatientIdentityIndex
) {
    if (identity.rn && (existingPatients.rn.has(identity.rn) || processedPatients.rn.has(identity.rn))) {
        return true;
    }

    if (identity.passport && (existingPatients.passport.has(identity.passport) || processedPatients.passport.has(identity.passport))) {
        return true;
    }

    if (identity.nameDob && (existingPatients.nameDob.has(identity.nameDob) || processedPatients.nameDob.has(identity.nameDob))) {
        return true;
    }

    return false;
}

function normalizeIdentityValue(value?: string | null) {
    return normalizeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeText(value?: string | null) {
    return (value || '').trim().replace(/\s+/g, ' ');
}

function buildNameDobKey(name?: string | null, dateOfBirth?: string | null) {
    const normalizedName = normalizeText(name).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
    const normalizedDate = normalizeDateValue(dateOfBirth);

    if (!normalizedName || !normalizedDate) {
        return '';
    }

    return `${normalizedName}|${normalizedDate}`;
}

function normalizeImportRow(row: PatientImportInput): PatientImportRow {
    const record = row as Record<string, any>;

    if (Array.isArray(row)) {
        return {
            Name: normalizeText(row[0]),
            RegistrationNumber: normalizeText(row[1]),
            PassportNumber: normalizeText(row[2]),
            DateOfBirth: normalizeText(row[3]),
            InsurancePlan: normalizeText(row[4]),
            InsuranceAgent: normalizeText(row[5]),
        };
    }

    return {
        Name: normalizeText(record.Name ?? record.name),
        RegistrationNumber: normalizeText(record.RegistrationNumber ?? record.rn ?? record.RN),
        PassportNumber: normalizeText(record.PassportNumber ?? record.passport_number ?? record.passport),
        Gender: normalizeText(record.Gender ?? record.gender),
        Age: normalizeText(record.Age ?? record.age),
        DateOfBirth: normalizeText(record.DateOfBirth ?? record.date_of_birth ?? record.dob),
        PrimaryPhone: normalizeText(record.PrimaryPhone ?? record.phone1),
        SecondaryPhone: normalizeText(record.SecondaryPhone ?? record.phone2),
        InsuranceAgent: normalizeText(record.InsuranceAgent ?? record.insurance_agent),
        InsurancePlan: normalizeText(record.InsurancePlan ?? record.insurance_plan),
    };
}

function isHeaderRow(patient: PatientImportRow) {
    const name = patient.Name?.toLowerCase();
    const rn = patient.RegistrationNumber?.toLowerCase();
    const passport = patient.PassportNumber?.toLowerCase();

    return (
        name === 'name' ||
        rn === 'registrationnumber' || rn === 'registration number' || rn === 'rn' ||
        passport === 'passportnumber' || passport === 'passport number'
    );
}

function normalizeDateValue(dateValue?: string | null) {
    if (!dateValue) {
        return '';
    }

    const parsedDate = parseDate(dateValue);
    if (parsedDate) {
        return parsedDate.toISOString().split('T')[0];
    }

    return normalizeText(dateValue).toLowerCase();
}

// Helper function to parse various date formats
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const cleanDateStr = dateStr.trim().replace(/\s+/g, ' ');

    // Try parsing patterns like "25 Jul 1951", "23-May-1950", etc.
    try {
        // Check for date patterns

        // Pattern: DD-MMYYYY (e.g., "15-005303")
        if (/^\d{1,2}-\d{6}$/.test(cleanDateStr)) {
            const parts = cleanDateStr.split('-');
            if (parts.length === 2) {
                const day = parseInt(parts[0], 10);
                const monthYear = parts[1];

                // Assuming the first two digits are the month and the rest is the year
                // or some kind of code
                const month = parseInt(monthYear.substring(0, 2), 10);
                const year = parseInt(monthYear.substring(2), 10);

                // Validate month - if invalid, default to January
                const validMonth = month >= 1 && month <= 12 ? month - 1 : 0;

                // Handle potential 2-digit years vs 4-digit years/codes
                let fullYear;
                if (year >= 100 && year <= 9999) {
                    fullYear = year;
                } else {
                    // For 2-digit years, determine the century
                    // If year is > current 2-digit year, assume 1900s, else 2000s
                    const currentYear = new Date().getFullYear();
                    const currentCentury = Math.floor(currentYear / 100) * 100;
                    fullYear = year + (year > (currentYear % 100) ? 1900 : currentCentury);
                }

                // Create date object - we need to ensure day/month/year are valid
                if (day >= 1 && day <= 31) {
                    const date = new Date(fullYear, validMonth, day);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
        }

        // Pattern: DD Mon YYYY (e.g., "23 Jul 1951")
        if (/^\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}$/.test(cleanDateStr)) {
            return new Date(cleanDateStr);
        }

        // Pattern: DD-MMM-YYYY (e.g., "12-May-1950")
        if (/^\d{1,2}-[A-Za-z]{3,}-\d{4}$/.test(cleanDateStr)) {
            const [day, month, year] = cleanDateStr.split('-');
            return new Date(`${month} ${day}, ${year}`);
        }

        // Pattern: DDMonYYYY (e.g., "26Feb1963")
        if (/^\d{1,2}[A-Za-z]{3,}\d{4}$/.test(cleanDateStr)) {
            const day = cleanDateStr.substring(0, 2);
            const month = cleanDateStr.substring(2, cleanDateStr.length - 4);
            const year = cleanDateStr.substring(cleanDateStr.length - 4);
            return new Date(`${month} ${day}, ${year}`);
        }

        // Pattern: DD-MM-YYYY (e.g., "30-Oct-1983")
        if (/^\d{1,2}-[A-Za-z]{3,}-\d{4}$/.test(cleanDateStr)) {
            const [day, month, year] = cleanDateStr.split('-');
            return new Date(`${month} ${day}, ${year}`);
        }

        // Pattern: DDJulYYYY (e.g., "13July1974")
        if (/^\d{1,2}[A-Za-z]{4,}\d{4}$/.test(cleanDateStr)) {
            const day = cleanDateStr.match(/^\d{1,2}/)?.[0] || '';
            const month = cleanDateStr.match(/[A-Za-z]{4,}/)?.[0] || '';
            const year = cleanDateStr.match(/\d{4}$/)?.[0] || '';
            return new Date(`${month} ${day}, ${year}`);
        }

        // Last resort - try standard JavaScript Date parsing
        const date = new Date(cleanDateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }

        return null;
    } catch (error) {
        console.warn(`Error parsing date ${dateStr}:`, error);
        return null;
    }
}

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

export async function exportPatientsToExcel(
    filters: {
        search?: string;
        rn?: string;
        passport?: string;
        dob?: string;
    } = {}
): Promise<{
    success?: string;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any[];
}> {
    try {
        const client = await createAdminClient();

        // Build queries based on filters (no pagination for export - get all filtered records)
        const queries = [];

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
            const dateObj = new Date(filters.dob);
            if (!isNaN(dateObj.getTime())) {
                const isoDate = dateObj.toISOString().split('T')[0];
                queries.push(Query.search("date_of_birth", isoDate));
            }
        }

        const patients = await client.databases.listDocuments('Core', 'Patients', queries);

        // Format data for Excel export
        const formattedData = patients.documents.map(patient => ({
            Name: patient.name,
            Age: patient.age,
            Gender: patient.gender === PatientGender.MALE ? 'Male' :
                patient.gender === PatientGender.FEMALE ? 'Female' : 'Other',
            DateOfBirth: new Date(patient.date_of_birth).toLocaleDateString(),
            RegistrationNumber: patient.rn,
            PassportNumber: patient.passport_number,
            PrimaryPhone: patient.phone1,
            SecondaryPhone: patient.phone2 || '',
            InsuranceAgent: patient.insurance_agent || '',
            InsurancePlan: patient.insurance_plan || ''
        }));

        return {
            success: "Patients data prepared for export",
            data: formattedData
        };
    } catch (error) {
        console.error("Error preparing patients data for export:", error);
        return {
            error: "Error preparing patients data for export"
        };
    }
}