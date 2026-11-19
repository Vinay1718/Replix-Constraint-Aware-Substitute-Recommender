const VARIANTS = ["success", "neutral", "warning", "ai"];
const ExplanationTag = ({ label, variant = "success" }) => {
  const safe = VARIANTS.includes(variant) ? variant : "neutral";
  return <span className={`tag tag-${safe}`}>{label}</span>;
};
export default ExplanationTag;
