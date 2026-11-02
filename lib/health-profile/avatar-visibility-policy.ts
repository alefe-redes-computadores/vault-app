/** WebGL admission policy: foreground + visible area + user's 3D preference.
 *  No new animation loop, observer, database read, or clinical inference.
 */
export type AvatarVisibilityContext = {
  ready:boolean;
  expanded:boolean;
  mode:"3d" | "illustration";
  documentVisible:boolean;
  unavailable:boolean;
  size:"compact" | "expanded" | "hidden";
  previewVisible:boolean;
  reducedMotion?:boolean;
  resourceConstrained?:boolean;
};
export function canMountAvatar3D(input:AvatarVisibilityContext):boolean {
  return input.ready && input.expanded && input.mode === "3d" &&
    input.documentVisible && !input.unavailable &&
    (input.size === "expanded" || (input.previewVisible && !input.reducedMotion && !input.resourceConstrained));
}
