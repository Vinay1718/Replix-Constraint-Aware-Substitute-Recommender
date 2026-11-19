export const baseOptions = Object.freeze({ timestamps: true, versionKey: false });
export const unique = (arr) => (Array.isArray(arr) ? [...new Set(arr)] : arr);
