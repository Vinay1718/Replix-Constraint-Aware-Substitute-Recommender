import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    return next(new ApiError(422, details[0].message, details));
  }
  if (source === "body") req.body = result.data;
  else req.validated = { ...req.validated, [source]: result.data };
  next();
};
