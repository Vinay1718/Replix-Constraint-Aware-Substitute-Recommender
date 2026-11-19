import { useState } from "react";

const FeedbackForm = ({ onSubmit, title = "How good was this suggestion?" }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || sending) return;
    setSending(true);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      setSubmitted(true);
    } catch {
      /* the caller showed the error; keep the form open for a retry */
    } finally {
      setSending(false);
    }
  };

  if (submitted) return <p className="in-stock">Thanks for your feedback!</p>;

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <p className="feedback-title">{title}</p>
      <div className="rating-row" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={`rating-btn ${n <= rating ? "active" : ""}`} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</button>
        ))}
      </div>
      <input type="text" placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="submit" className="btn btn-outline btn-sm" disabled={rating === 0 || sending}>{sending ? "Sending..." : "Submit feedback"}</button>
    </form>
  );
};
export default FeedbackForm;
