import { parsePayHereCheckout } from './payment';
import type { PayHereCheckout } from './payment';

export function submitPayHere(checkout: PayHereCheckout) {
  const safe = parsePayHereCheckout(checkout);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = safe.action;
  for (const [name, value] of Object.entries(safe.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
