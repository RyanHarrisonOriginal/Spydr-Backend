export interface IClerkUserProfile {
  primaryEmail: string | null;
  fullName: string | null;
}

export interface IClerkProfileReader {
  getByUserId(userId: string): Promise<IClerkUserProfile | null>;
}
