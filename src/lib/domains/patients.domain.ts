export interface Patient {
    name: string;
    age: number;
    gender: PatientGender;
    date_of_birth: Date;
    rn: string;
    passport_number: string;
    phone1: string;

    // optional
    phone2?: string;
    insurance_agent: string;
    insurance_plan: string;
}

export enum PatientGender {
    MALE = 1,
    FEMALE = 2,
    OTHER = 3,
}

export interface PatientDomain {
    name: string;
    gender: number; // 1 for male, 2 for female
    age: number | null;
    date_of_birth: string | null; // ISO string format
    rn: string; // Registration Number
    passport_number: string;
    primary_phone: string;
    secondary_phone: string;
    insurance_agent: string;
    insurance_plan: string;
}