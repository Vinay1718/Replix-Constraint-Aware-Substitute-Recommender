const Loader = ({ label = "Loading..." }) => (
  <div className="loader" role="status"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>
);
export default Loader;
