'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { previewChange, submitManagement } from './management-api';
import type { ChangeInput } from './management';

export async function previewBookingChange(id: string, input: ChangeInput) {
  const token = (await cookies()).get('hw_guest_session')?.value;
  return previewChange(process.env.API_GATEWAY_URL, token, id, input);
}
export async function saveBookingManagement(
  id: string,
  attempt:
    | { kind: 'MODIFIED'; quoteToken: string; key: string }
    | { kind: 'CANCELLED'; revision: number; key: string },
) {
  const token = (await cookies()).get('hw_guest_session')?.value;
  const result = await submitManagement(
    process.env.API_GATEWAY_URL,
    token,
    id,
    attempt,
  );
  if (result.value) {
    revalidatePath('/profile');
    revalidatePath(`/profile/bookings/${id}`);
    revalidatePath('/booking/confirmation');
  }
  return result;
}
