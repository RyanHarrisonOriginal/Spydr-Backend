import type { OrganizationMemberRole } from "../../domain/models/organizations/index.js";

export interface IOrgRequestContext {
  userId: string;
  orgId: string;
  role: OrganizationMemberRole;
}

declare global {
  namespace Express {
    interface Request {
      orgContext?: IOrgRequestContext;
    }
  }
}

export {};
