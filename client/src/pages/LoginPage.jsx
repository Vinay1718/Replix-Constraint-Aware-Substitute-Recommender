import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../utils/constants";

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search}` : ROUTES.HOME;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setError("");
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p className="form-error">{error}</p>}
        <label className="form-field">Email
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
        </label>
        <label className="form-field">Password
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        <p className="muted center">No account? <Link to={ROUTES.REGISTER}>Register</Link></p>
      </form>
    </div>
  );
};
export default LoginPage;
