export interface Patient {
    name: string;
    age: number;
    gender: PatientGender;
    date_of_birth: Date;
    rn: string;
    passport_number: string;

    // optional
    insurance_agent: string;
    insurance_plan: string;
}

export enum PatientGender {
    MALE = 1,
    FEMALE = 2,
    OTHER = 3,
}