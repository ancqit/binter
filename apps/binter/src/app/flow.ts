/** After a failed call, paint the portal only while the number is still held.
 *  A 401 clears the number first, so the next paint stays on the gate.
 */
export function keepPortal(token: string): boolean {
  return token.length > 0;
}

export type Paint = 'gate' | 'portal';

export function paintAfterFailure(token: string): Paint {
  return keepPortal(token) ? 'portal' : 'gate';
}
