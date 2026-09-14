export interface ISendOrganizationInvitationInput {
  email: string;
  token: string;
  organizationName: string;
}

export interface IClerkInvitationSender {
  send(input: ISendOrganizationInvitationInput): Promise<void>;
}
