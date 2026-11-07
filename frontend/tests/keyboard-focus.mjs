// Executed in the browser via Runtime.evaluate. Do not capture Node values.
export async function focusKeyboardButton(label) {
  const button = [...document.querySelectorAll('button')].find(
    (element) => element.textContent.trim() === label,
  );
  if (
    !button ||
    button.disabled ||
    !Object.keys(button).some((key) => key.startsWith('__reactProps$'))
  ) {
    return false;
  }
  button.focus();
  // Hydration/navigation effects can focus the page heading after the button's
  // React props appear. Let rendering settle and verify the real keyboard target.
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  return (
    button.isConnected && !button.disabled && document.activeElement === button
  );
}
