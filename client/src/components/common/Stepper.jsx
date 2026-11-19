const Stepper = ({ steps, current }) => (
  <ol className="stepper">
    {steps.map((label, i) => (
      <li key={label} className={i < current ? "done" : i === current ? "active" : ""}>
        <span className="step-dot">{i < current ? "✓" : i + 1}</span><span>{label}</span>
      </li>
    ))}
  </ol>
);
export default Stepper;
