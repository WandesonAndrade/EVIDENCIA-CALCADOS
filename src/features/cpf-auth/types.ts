export type CpfCheckStatus = 
  | 'pre_registered_pending'
  | 'already_registered'
  | 'not_pre_registered';

export interface PreRegisteredClient {
  name: string;
  status: 'pending' | 'registered';
  claimedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserAuthDoc {
  uid: string;
  name: string;
  cpf: string;
  email: string;
  emailReal?: string;
  createdAt: any;
  role?: string;
  phone?: string;
}

export interface CpfCheckResult {
  status: CpfCheckStatus;
  name?: string;
  message?: string;
}

export interface CpfAuthSuccess<T> {
  success: true;
  data: T;
}

export interface CpfAuthFailure {
  success: false;
  error: string;
  code?: string;
}

export type CpfAuthResult<T> = CpfAuthSuccess<T> | CpfAuthFailure;

export type EmailMigrationStep = 'input' | 'reauth' | 'sent';

export interface EmailMigrationResult {
  success: boolean;
  requiresReauth?: boolean;
  message?: string;
}
