'use client';

import { useEffect, useRef, useState } from 'react';
import type { RoomType } from '../catalogue';
import { roomPrice } from '../catalogue';
import { MAX_COMPARISON_ROOMS, toggleComparisonRoom } from '../comparison';
import { RoomCard } from './room-card';
import styles from '../rooms.module.css';

export function RoomComparison({
  rooms,
  availability,
  bookingLinks,
}: {
  rooms: RoomType[];
  availability?: Record<string, string>;
  bookingLinks?: Record<string, string>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const compareButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = selectedIds.flatMap((id) =>
    rooms.filter((room) => room.roomTypeId === id),
  );
  const atLimit = selected.length === MAX_COMPARISON_ROOMS;

  useEffect(() => {
    if (isOpen) heading.current?.focus();
  }, [isOpen]);

  function toggle(roomId: string) {
    setSelectedIds((previous) => toggleComparisonRoom(previous, roomId));
    setIsOpen(false);
  }

  function close() {
    setIsOpen(false);
    compareButton.current?.focus();
  }

  return (
    <>
      <div className={styles.compareBar} aria-label="Room comparison selection">
        <div>
          <p id="comparison-help" role="status">
            {selected.length} of {MAX_COMPARISON_ROOMS} rooms selected.{' '}
            {atLimit
              ? 'Limit reached. Remove a room to select another.'
              : 'Select two or three room types to compare.'}
          </p>
          {selected.length > 0 && (
            <ul className={styles.selectedRooms} aria-label="Selected rooms">
              {selected.map((room) => (
                <li key={room.roomTypeId}>
                  <button
                    type="button"
                    onClick={() => toggle(room.roomTypeId)}
                    aria-label={`Remove ${room.typeName} from comparison`}
                  >
                    {room.typeName} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          ref={compareButton}
          type="button"
          className="button button-outline"
          disabled={selected.length < 2}
          aria-expanded={isOpen}
          aria-controls="room-comparison"
          aria-describedby="comparison-help"
          onClick={() => setIsOpen((previous) => !previous)}
        >
          Compare rooms
        </button>
      </div>
      {isOpen && selected.length >= 2 && (
        <section
          id="room-comparison"
          className={styles.comparison}
          aria-labelledby="comparison-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className={styles.comparisonHeading}>
            <h3 id="comparison-title" tabIndex={-1} ref={heading}>
              Compare your rooms
            </h3>
            <button
              type="button"
              className="button button-blue"
              onClick={close}
            >
              Close comparison
            </button>
          </div>
          <div
            className={styles.comparisonScroll}
            role="region"
            aria-label="Room comparison table; scroll horizontally on smaller screens"
            tabIndex={0}
          >
            <table className={styles.comparisonTable}>
              <caption>
                Nightly rates, capacity and amenities for your selected room
                types
              </caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  {selected.map((room) => (
                    <th scope="col" key={room.roomTypeId}>
                      {room.typeName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Price per night</th>
                  {selected.map((room) => (
                    <td key={room.roomTypeId}>{roomPrice(room)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Maximum guests</th>
                  {selected.map((room) => (
                    <td key={room.roomTypeId}>{room.maxGuests}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Description</th>
                  {selected.map((room) => (
                    <td key={room.roomTypeId}>
                      {room.description || 'Description not supplied.'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Amenities</th>
                  {selected.map((room) => (
                    <td key={room.roomTypeId}>
                      {room.amenities.length ? (
                        <ul>
                          {room.amenities.map((amenity, index) => (
                            <li key={`${amenity}-${index}`}>{amenity}</li>
                          ))}
                        </ul>
                      ) : (
                        'Amenities not supplied.'
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Availability must be checked for your dates. Selecting rooms does
            not reserve them.
          </p>
        </section>
      )}
      <div className={styles.grid}>
        {rooms.map((room) => (
          <RoomCard
            key={room.roomTypeId}
            room={room}
            availability={availability?.[room.roomTypeId]}
            bookingHref={bookingLinks?.[room.roomTypeId]}
            comparison={{
              selected: selectedIds.includes(room.roomTypeId),
              disabled: atLimit && !selectedIds.includes(room.roomTypeId),
              onToggle: () => toggle(room.roomTypeId),
            }}
          />
        ))}
      </div>
    </>
  );
}
