import { Role } from '../constants/roles';

export interface PlayerRegistration {
  battleTag: string;
  roles: Role[];
  primaryRole?: Role;
  secondaryRoles?: Role[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data: T | null;
}
