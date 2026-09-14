import { describe, expect, it, vi } from "vitest";
import { PersonMapper } from "../mappers/index.js";
import type { IPersonRepository } from "../repository.js";
import type { IPersonViews } from "../views.js";
import type { IClerkProfileReader } from "../clerk-profile.js";
import {
  SyncPersonFromClerkCommand,
  SyncPersonFromClerkCommandHandler,
} from "./sync-person-from-clerk.command.js";

function createPerson(email: string | null, fullName = "Ada Lovelace") {
  return new PersonMapper().toModel(
    "user-1",
    "org-1",
    {
      fullName,
      email,
      clerkUserId: "user-1",
    },
    new Date("2026-01-01T00:00:00.000Z")
  );
}

function createViews(person: ReturnType<typeof createPerson> | null): IPersonViews {
  return {
    listByOrg: vi.fn(),
    getById: vi.fn(),
    getByClerkUserId: vi.fn().mockResolvedValue(person),
    getByEmailInOrg: vi.fn(),
    nextSortOrderForOrg: vi.fn(),
  };
}

function createPeople(save = vi.fn(async (entity) => entity)): IPersonRepository {
  return {
    get: vi.fn(),
    save,
    delete: vi.fn(),
  };
}

describe("SyncPersonFromClerkCommandHandler", () => {
  it("overwrites a stale person email with Clerk's primary email", async () => {
    const person = createPerson("old@example.com");
    const save = vi.fn(async (entity) => entity);
    const handler = new SyncPersonFromClerkCommandHandler(
      createPeople(save),
      createViews(person),
      {
        getByUserId: vi.fn().mockResolvedValue({
          primaryEmail: "ada@example.com",
          fullName: "Ada Lovelace",
        }),
      } satisfies IClerkProfileReader
    );

    const result = await handler.execute(new SyncPersonFromClerkCommand("user-1"));

    expect(result?.details?.email).toBe("ada@example.com");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("writes Clerk primary email onto the linked person", async () => {
    const person = createPerson(null);
    const save = vi.fn(async (entity) => entity);
    const handler = new SyncPersonFromClerkCommandHandler(
      createPeople(save),
      createViews(person),
      {
        getByUserId: vi.fn().mockResolvedValue({
          primaryEmail: "ada@example.com",
          fullName: "Ada Lovelace",
        }),
      } satisfies IClerkProfileReader
    );

    const result = await handler.execute(new SyncPersonFromClerkCommand("user-1"));

    expect(result?.details?.email).toBe("ada@example.com");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite an existing person name", async () => {
    const person = createPerson("ada@example.com", "Ada");
    const save = vi.fn(async (entity) => entity);
    const handler = new SyncPersonFromClerkCommandHandler(
      createPeople(save),
      createViews(person),
      {
        getByUserId: vi.fn().mockResolvedValue({
          primaryEmail: "ada@example.com",
          fullName: "Ada Lovelace",
        }),
      } satisfies IClerkProfileReader
    );

    const result = await handler.execute(new SyncPersonFromClerkCommand("user-1"));

    expect(result?.details?.fullName).toBe("Ada");
    expect(save).not.toHaveBeenCalled();
  });

  it("skips save when Clerk email already matches", async () => {
    const person = createPerson("ada@example.com");
    const save = vi.fn(async (entity) => entity);
    const handler = new SyncPersonFromClerkCommandHandler(
      createPeople(save),
      createViews(person),
      {
        getByUserId: vi.fn().mockResolvedValue({
          primaryEmail: "ADA@example.com",
          fullName: "Ada Lovelace",
        }),
      } satisfies IClerkProfileReader
    );

    await handler.execute(new SyncPersonFromClerkCommand("user-1"));

    expect(save).not.toHaveBeenCalled();
  });

  it("no-ops when no person is linked to the Clerk user", async () => {
    const clerkProfiles: IClerkProfileReader = {
      getByUserId: vi.fn(),
    };
    const people = createPeople();
    const handler = new SyncPersonFromClerkCommandHandler(
      people,
      createViews(null),
      clerkProfiles
    );

    const result = await handler.execute(new SyncPersonFromClerkCommand("user-1"));

    expect(result).toBeNull();
    expect(clerkProfiles.getByUserId).not.toHaveBeenCalled();
    expect(people.save).not.toHaveBeenCalled();
  });
});
