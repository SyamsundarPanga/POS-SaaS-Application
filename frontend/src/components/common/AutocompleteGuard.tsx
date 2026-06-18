import { useEffect } from 'react';

type AutofillControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const FORM_SELECTOR = 'form:not([data-allow-autocomplete="true"])';
const CONTROL_SELECTOR = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"])',
  'textarea',
  'select',
].join(', ');

const applyBlockerStyles = (element: HTMLInputElement) => {
  Object.assign(element.style, {
    position: 'absolute',
    opacity: '0',
    pointerEvents: 'none',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
  });
  element.tabIndex = -1;
  element.setAttribute('aria-hidden', 'true');
};

const createBlockerInput = ({
  type,
  name,
  autoComplete,
  marker,
}: {
  type: 'text' | 'password';
  name: string;
  autoComplete: string;
  marker: string;
}) => {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.readOnly = true;
  input.setAttribute('autocomplete', autoComplete);
  input.setAttribute('data-autocomplete-blocker', marker);
  applyBlockerStyles(input);
  return input;
};

const hardenFormAutocomplete = (form: HTMLFormElement) => {
  form.setAttribute('autocomplete', 'off');
  form.setAttribute('data-lpignore', 'true');
  form.setAttribute('data-1p-ignore', 'true');

  if (form.querySelector('[data-autocomplete-blocker="username"]')) {
    return;
  }

  const usernameBlocker = createBlockerInput({
    type: 'text',
    name: 'prevent_autofill_username',
    autoComplete: 'username',
    marker: 'username',
  });
  const passwordBlocker = createBlockerInput({
    type: 'password',
    name: 'prevent_autofill_password',
    autoComplete: 'new-password',
    marker: 'password',
  });

  form.prepend(passwordBlocker);
  form.prepend(usernameBlocker);

  window.requestAnimationFrame(() => {
    usernameBlocker.readOnly = false;
    passwordBlocker.readOnly = false;
  });
};

const hardenControlAutocomplete = (control: AutofillControl) => {
  if (control.dataset.allowAutocomplete === 'true') {
    return;
  }

  if (!control.getAttribute('autocomplete')) {
    const value = control instanceof HTMLInputElement && control.type === 'password'
      ? 'new-password'
      : 'off';
    control.setAttribute('autocomplete', value);
  }

  control.setAttribute('data-lpignore', 'true');
  control.setAttribute('data-1p-ignore', 'true');
};

const applyAutocompleteGuard = (root: ParentNode) => {
  root.querySelectorAll<HTMLFormElement>(FORM_SELECTOR).forEach(hardenFormAutocomplete);
  root.querySelectorAll<AutofillControl>(CONTROL_SELECTOR).forEach(hardenControlAutocomplete);
};

const AutocompleteGuard = () => {
  useEffect(() => {
    applyAutocompleteGuard(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }

          if (node.matches(FORM_SELECTOR)) {
            hardenFormAutocomplete(node as HTMLFormElement);
          }

          if (node.matches(CONTROL_SELECTOR)) {
            hardenControlAutocomplete(node as AutofillControl);
          }

          applyAutocompleteGuard(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
};

export default AutocompleteGuard;
