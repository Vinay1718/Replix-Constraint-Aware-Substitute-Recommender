export const PASS = Object.freeze({ passed: true });
export const fail = (reason) => ({ passed: false, reason });
