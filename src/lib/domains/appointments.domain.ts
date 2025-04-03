export interface Appointment {
    patient_id: string;
    type: AppointmentType;
    admission_type: AppointmentAdmissionType;
    datetime: Date;
    doctor: string;
    status: AppointmentStatus;
}

export enum AppointmentType {
    MEDICAL_CHECKUP = 1,
    CONSULTATION = 2,
}

export enum AppointmentAdmissionType {
    WALK_IN = 1,
    DAY_CARE = 2,
}

export enum AppointmentStatus {
    PENDING = 0,
    CONFIRMED = 1,
    CANCELLED = 2,
    COMPLETED = 3,
}
