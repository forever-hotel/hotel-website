/** Explicit hostnames only, shared with Next.js image configuration. */
export function getRoomImageHosts(): string[] {
  return (process.env.ROOM_IMAGE_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter((host) => /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(host));
}

export function safeRoomImage(source: string): string | undefined {
  if (
    source.startsWith('/images/') &&
    !source.includes('..') &&
    !/[\\%?#]/.test(source)
  )
    return source;
  try {
    const url = new URL(source);
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      getRoomImageHosts().includes(url.hostname)
    )
      return url.href;
  } catch {
    /* Invalid image URLs use the readable fallback. */
  }
  return undefined;
}
