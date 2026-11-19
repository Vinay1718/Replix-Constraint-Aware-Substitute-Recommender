import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../utils/constants";

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={ROUTES.HOME} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError("All fields are required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const { name, email, password } = form;
      await register({ name, email, password });
      toast.success("Account created!");
      navigate(ROUTES.PREFERENCES, { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <p className="form-error">{error}</p>}
        <label className="form-field">Full Name<input name="name" value={form.name} onChange={handleChange} /></label>
        <label className="form-field">Email<input type="email" name="email" value={form.email} onChange={handleChange} /></label>
        <label className="form-field">Password<input type="password" name="password" value={form.password} onChange={handleChange} /></label>
        <label className="form-field">Confirm Password<input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} /></label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
        <p className="muted center">Already registered? <Link to={ROUTES.LOGIN}>Login</Link></p>
      </form>
    </div>
  );
};
export default RegisterPage;
