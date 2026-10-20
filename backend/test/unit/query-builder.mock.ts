// Fake TypeORM SelectQueryBuilder/InsertQueryBuilder for repository unit tests.
// Chain methods return the same fake; result methods are mocks to stub per test.
const CHAIN_METHODS = [
  'insert',
  'into',
  'values',
  'where',
  'andWhere',
  'addSelect',
  'leftJoinAndSelect',
  'orderBy',
  'addOrderBy',
] as const;
const RESULT_METHODS = ['execute', 'getOne', 'getMany', 'getCount'] as const;

type QueryBuilderMethod =
  (typeof CHAIN_METHODS)[number] | (typeof RESULT_METHODS)[number];

export type QueryBuilderMock = Record<QueryBuilderMethod, jest.Mock>;

export function createQueryBuilderMock(): QueryBuilderMock {
  const queryBuilder = {} as QueryBuilderMock;
  for (const method of CHAIN_METHODS) {
    queryBuilder[method] = jest.fn(() => queryBuilder);
  }
  for (const method of RESULT_METHODS) {
    queryBuilder[method] = jest.fn();
  }
  return queryBuilder;
}
