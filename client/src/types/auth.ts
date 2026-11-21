
export type UserRole =
  | "TRAINING_CENTRE"
  | "DISTRICT_OFFICER"
  | "QUALITY_OFFICER"
  | "STATE_OFFICER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district: string | null;
  centreName: string | null;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}
