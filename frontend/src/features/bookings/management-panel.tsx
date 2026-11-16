import { cookies } from 'next/headers';
import { getRoomCatalogue } from '@/features/rooms/catalogue';
import { readManagement } from './management-api';
import { ManagementControls } from './management-controls';

export async function BookingManagementPanel({ id }: { id: string }) {
  const token = (await cookies()).get('hw_guest_session')?.value;
  const initial = await readManagement(process.env.API_GATEWAY_URL, token, id);
  const catalogue = initial.value?.eligible ? await getRoomCatalogue() : null;
  const rooms =
    catalogue?.state === 'ready'
      ? catalogue.rooms.map(({ roomTypeId, typeName, maxGuests }) => ({
          roomTypeId,
          typeName,
          maxGuests,
        }))
      : null;
  return <ManagementControls id={id} initial={initial} rooms={rooms} />;
}
