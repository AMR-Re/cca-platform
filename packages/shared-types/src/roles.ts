/**
 * Platform-wide role identifiers.
 *
 * This is a naming contract shared between frontend and backend for
 * future RBAC work (Phase 3+). No authorization logic lives here -
 * this file only exists so both apps agree on the same string values.
 */
export enum PlatformRole {
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  CCA_COORDINATOR = 'CCA_COORDINATOR',
  PROVIDER_ADMIN = 'PROVIDER_ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  PARENT = 'PARENT',
}

export const ALL_PLATFORM_ROLES: PlatformRole[] = Object.values(PlatformRole);
