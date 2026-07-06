import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IOrganizationRepository } from "../domain/interfaces/organization-repository.js";

export const ORG_ID_HEADER = "x-org-id";

export function getOrgIdHeader(req: Request): string | null {
  const value = req.headers[ORG_ID_HEADER];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createRequireOrgContext(organizations: IOrganizationRepository) {
  return async (req: Request, res: Response, next: () => void): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const orgId = getOrgIdHeader(req);
    if (!orgId) {
      res.status(400).json({ message: "X-Org-Id header is required" });
      return;
    }

    const role = await organizations.getMemberRole(userId, orgId);
    if (!role) {
      res.status(403).json({ message: "Not a member of this organization" });
      return;
    }

    req.orgContext = { userId, orgId, role };
    next();
  };
}

export function getOrgContext(req: Request, res: Response) {
  if (req.orgContext) {
    return req.orgContext;
  }

  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  res.status(400).json({ message: "X-Org-Id header is required" });
  return null;
}

export function getUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return userId;
}
