/** Input lifecycle; only committed values invoke the callback. */
export function createSearchSubmission(commit: (value: string, history: "push" | "replace") => void, delay = 250) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let composing = false;
  let value = "";
  const cancel = () => { clearTimeout(timer); timer = undefined; };
  const submit = (history: "push" | "replace" = "push") => { cancel(); if (!composing) commit(value, history); };
  const change = (next: string) => {
    value = next; cancel();
    if (!composing) timer = setTimeout(() => submit("replace"), delay);
  };
  return { change, submit, cancel,
    compositionStart() { composing = true; cancel(); },
    compositionEnd(next: string) { composing = false; change(next); },
    clear() { composing = false; value = ""; submit(); },
  };
}
