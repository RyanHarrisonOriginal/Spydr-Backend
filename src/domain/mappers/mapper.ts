export interface IDomainMapper<TPersistenceRead, TDomain, TPersistenceWrite = TPersistenceRead> {
  toDomain(persistence: TPersistenceRead): TDomain;
  toPersistence(domain: TDomain): TPersistenceWrite;
}

export interface IRepresentationMapper<TDomain, TRepresentation> {
  toRepresentation(domain: TDomain): TRepresentation;
}
