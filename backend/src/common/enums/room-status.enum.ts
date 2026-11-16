/** Mirrors the shared PostgreSQL `room_status` enum (SRS 13.1.5). */
export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  REQUIRES_CLEANING = 'REQUIRES_CLEANING',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
}
