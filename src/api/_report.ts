/* This function for debug only! */
export default function <T>(val: T): T {
  const now = new Date();
  const caller = new Error().stack?.split("\n")[2].split(/\s+/)[2];
  console.debug(now, caller, val);
  return val;
}
