const LABELS = { placed: "Placed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const StatusBadge = ({ status }) => <span className={`status status-${status}`}>{LABELS[status] ?? status}</span>;
export default StatusBadge;
