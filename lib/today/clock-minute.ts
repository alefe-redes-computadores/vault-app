/** Minute-level UI clock identity: preserve the Date object to prevent useless React re-renders.
 * Local calendar components are compared so midnight and DST transitions are never folded together.
 * This is only visual display state; actual dose timestamps are captured in clinical handlers.
 */
export function isSameLocalMinute(previous: Date, next: Date): boolean {
  return previous.getFullYear() === next.getFullYear()
    && previous.getMonth() === next.getMonth()
    && previous.getDate() === next.getDate()
    && previous.getHours() === next.getHours()
    && previous.getMinutes() === next.getMinutes();
}
