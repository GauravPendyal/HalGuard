export type VerificationErrorCode =
  | 'TIMEOUT'
  | 'DISCONNECTED'
  | 'BACKEND_BUSY'
  | 'RATE_LIMITED'
  | 'AUTH_FAILED'
  | 'AGENT_FAILURE'
  | 'UNKNOWN_ERROR';

export interface HumanError {
  code: VerificationErrorCode;
  title: string;
  message: string;
}

export class ErrorMapper {
  static mapError(error: unknown): HumanError {
    const errString = String(error).toLowerCase();
    if (errString.includes('timeout')) {
      return { code: 'TIMEOUT', title: 'Verification Timeout', message: 'The backend verification service exceeded the response timeout.' };
    }
    if (errString.includes('rate')) {
      return { code: 'RATE_LIMITED', title: 'Rate Limited', message: 'Too many verification requests submitted in short interval.' };
    }
    return { code: 'UNKNOWN_ERROR', title: 'Verification Warning', message: 'Encountered unexpected response during verification.' };
  }
}
