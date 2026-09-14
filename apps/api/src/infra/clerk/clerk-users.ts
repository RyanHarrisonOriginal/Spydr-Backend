import { createClerkClient } from "@clerk/backend";
import type {
  IClerkInvitationSender,
  ISendOrganizationInvitationInput,
} from "../../domains/organizations/invitation-sender.js";
import type {
  IClerkUserDirectory,
  IClerkUserRecord,
} from "../../domains/organizations/clerk-user-directory.js";
import type {
  IClerkProfileReader,
  IClerkUserProfile,
} from "../../domains/people/clerk-profile.js";

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required");
  }
  return createClerkClient({ secretKey });
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function clerkFullName(user: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string | null {
  const fullName =
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || null;
}

export async function getClerkUserEmails(userId: string): Promise<string[]> {
  const user = await getClerkClient().users.getUser(userId);
  const emails = user.emailAddresses.map((entry) =>
    entry.emailAddress.trim().toLowerCase()
  );
  return [...new Set(emails.filter(Boolean))];
}

export async function getClerkUserFullName(userId: string): Promise<string | null> {
  const user = await getClerkClient().users.getUser(userId);
  return clerkFullName(user);
}

export class ClerkUserDirectory implements IClerkUserDirectory, IClerkProfileReader {
  async findByEmail(email: string): Promise<IClerkUserRecord | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const result = await getClerkClient().users.getUserList({
      emailAddress: [normalized],
      limit: 1,
    });
    const user = result.data[0];
    if (!user) return null;

    return { userId: user.id, fullName: clerkFullName(user) };
  }

  async getByUserId(userId: string): Promise<IClerkUserProfile | null> {
    const user = await getClerkClient().users.getUser(userId);
    const primaryEmail =
      normalizeEmail(user.primaryEmailAddress?.emailAddress) ??
      normalizeEmail(
        user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)
          ?.emailAddress
      ) ??
      normalizeEmail(user.emailAddresses[0]?.emailAddress);

    return {
      primaryEmail,
      fullName: clerkFullName(user),
    };
  }
}

export class ClerkInvitationSender implements IClerkInvitationSender {
  async send(input: ISendOrganizationInvitationInput): Promise<void> {
    const redirectUrl = `${getFrontendUrl()}/invites/${input.token}`;

    try {
      await getClerkClient().invitations.createInvitation({
        emailAddress: input.email,
        redirectUrl,
        publicMetadata: {
          organizationName: input.organizationName,
          inviteToken: input.token,
        },
      });
    } catch (error) {
      // Existing Clerk users cannot receive a sign-up invitation; they accept in-app.
      console.info(
        `Clerk invitation not sent for ${input.email} (user may already exist)`,
        error instanceof Error ? error.message : error
      );
    }
  }
}
