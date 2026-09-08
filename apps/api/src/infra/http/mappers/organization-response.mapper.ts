import type { Organization } from "../../../domains/organizations/models/index.js";

export class OrganizationResponseMapper {
  toRepresentation(org: Organization) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }
}
