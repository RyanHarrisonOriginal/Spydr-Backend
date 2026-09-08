import type { Organization } from "./models/index.js";

export interface ICreateOrganizationInput {
  name: string;
}

export interface IOrganizationRepository {
  get(criteria: {
    id: string;
    userId?: string;
  }): Promise<Organization | null>;
  save(
    entity: Organization | ICreateOrganizationInput,
    options?: { strategy?: string; context?: { userId: string } }
  ): Promise<Organization>;
  delete(id: string): Promise<void>;
}
