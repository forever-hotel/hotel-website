export function validateImages(images) {
  for (const key of ["frontend", "backend"]) {
    if (
      !/^ghcr\.io\/[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/.test(
        images?.[key] || "",
      )
    )
      throw new Error("Two immutable GHCR image digests are required.");
  }
  return { frontend: images.frontend, backend: images.backend };
}

/** Save the working pointer only after health and external smoke checks succeed. */
export async function release(candidate, adapter) {
  validateImages(candidate);
  const state = await adapter.readState();
  if (state?.current) validateImages(state.current);
  try {
    await adapter.deploy(candidate, true);
    await adapter.smoke();
    const unchanged =
      state?.current &&
      candidate.frontend === state.current.frontend &&
      candidate.backend === state.current.backend;
    await adapter.writeState({
      current: candidate,
      previous: unchanged ? state.previous || null : state?.current || null,
    });
    return { status: "released", images: candidate };
  } catch {
    if (!state?.current) {
      try {
        await adapter.stop();
        return { status: "failed_no_previous_release" };
      } catch {
        return { status: "failed_first_release_stop_unverified" };
      }
    }
    try {
      await adapter.deploy(state.current, false);
      await adapter.smoke();
      return { status: "failed_rolled_back", restored: state.current };
    } catch {
      return { status: "failed_rollback_unverified", restored: state.current };
    }
  }
}
