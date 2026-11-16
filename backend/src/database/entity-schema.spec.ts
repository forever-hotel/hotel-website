import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, EntityMetadata } from 'typeorm';
import { ConnectionMetadataBuilder } from 'typeorm/connection/ConnectionMetadataBuilder';
import { Guest } from '../guests/entities/guest.entity';
import { RoomTypeAmenity } from '../room-types/entities/room-type-amenity.entity';
import { RoomTypeImage } from '../room-types/entities/room-type-image.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { Room } from '../room-types/entities/room.entity';

// Read-only copy of the forever-hotel/infra schema, kept at the repository root.
const SCHEMA_FILE = join(
  __dirname,
  '../../../database/infra-schema/01_forever_hotel_schema.sql',
);

const ENTITIES = [Guest, RoomType, RoomTypeImage, RoomTypeAmenity, Room];

/** Reads `CREATE TABLE` statements and returns the column names of each table. */
function readSchemaColumns(): Map<string, string[]> {
  const sql = readFileSync(SCHEMA_FILE, 'utf8').replace(/\r\n/g, '\n');
  const tables = new Map<string, string[]>();
  for (const [, table, body] of sql.matchAll(
    /CREATE TABLE (\w+) \(\n([\s\S]*?)\n\);/g,
  )) {
    // Column definitions start at two spaces; constraints are upper case.
    const columns = [...body.matchAll(/^ {2}([a-z_]+)\s/gm)].map(
      ([, column]) => column,
    );
    tables.set(table, columns);
  }
  return tables;
}

describe('entities match the infra schema', () => {
  const schema = readSchemaColumns();
  let metadatas: EntityMetadata[];

  beforeAll(async () => {
    // Builds the TypeORM mapping without connecting to a database.
    const dataSource = new DataSource({ type: 'postgres', entities: [] });
    metadatas = await new ConnectionMetadataBuilder(
      dataSource,
    ).buildEntityMetadatas(ENTITIES);
  });

  it.each(ENTITIES.map((entity) => [entity.name, entity]))(
    'should map %s onto an existing table with exactly its columns',
    (_name, entity) => {
      // Arrange
      const metadata = metadatas.find((item) => item.target === entity);
      if (!metadata) {
        throw new Error(`No metadata built for ${entity.name}`);
      }

      // Act
      const entityColumns = metadata.columns
        .map((column) => column.databaseName)
        .sort();

      // Assert
      expect(schema.has(metadata.tableName)).toBe(true);
      expect(entityColumns).toEqual(
        [...(schema.get(metadata.tableName) ?? [])].sort(),
      );
    },
  );
});
