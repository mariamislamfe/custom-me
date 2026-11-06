/**
 * Hands a design file picked on the home page over to the Lab. Client-side
 * navigation keeps this module alive, so the File itself travels and is
 * uploaded by the Lab like any other; on a full page load there's simply
 * nothing waiting.
 */
let waiting: File | null = null;

export function handOff(file: File | null) {
  waiting = file;
}

export const hasHandoff = () => waiting !== null;

export function takeHandoff() {
  const file = waiting;
  waiting = null;
  return file;
}
