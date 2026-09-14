export interface IClerkUserRecord {
  userId: string;
  fullName: string | null;
}

export interface IClerkUserDirectory {
  findByEmail(email: string): Promise<IClerkUserRecord | null>;
}
