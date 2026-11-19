const EmptyState = ({ icon = "🛒", title, children }) => (
  <div className="empty">
    <div className="empty-icon" aria-hidden="true">{icon}</div>
    <h2>{title}</h2>
    <div className="empty-body">{children}</div>
  </div>
);
export default EmptyState;
