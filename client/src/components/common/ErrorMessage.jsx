const ErrorMessage = ({ message, onRetry }) => (
  <div className="card error-box" role="alert">
    <p className="form-error">{message || "Something went wrong."}</p>
    {onRetry && <button className="btn btn-outline" onClick={onRetry}>Try again</button>}
  </div>
);
export default ErrorMessage;
