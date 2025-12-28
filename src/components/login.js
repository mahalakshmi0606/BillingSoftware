import React, { useState } from "react";
import { FaEye, FaEyeSlash, FaUserLock } from "react-icons/fa";

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: "", // username OR email
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.username, // backend expects email
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // ✅ Save user data (and token later)
      localStorage.setItem("user", JSON.stringify(data.user));

      // If JWT added later
      // localStorage.setItem("token", data.access_token);

      setLoading(false);
      onLogin(); // Open dashboard

    } catch (err) {
      console.error(err);
      setError("Server not reachable");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleLogin}>
        <div style={styles.iconBox}>
          <FaUserLock size={40} color="#004aad" />
        </div>

        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Please login to continue</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          type="text"
          name="username"
          placeholder="Username or Email"
          value={formData.username}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <div style={styles.passwordBox}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={styles.passwordInput}
            required
          />
          <span
            style={styles.eyeIcon}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={styles.footerText}>
          © 2025 Your Company Name
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #004aad, #00bfff)",
  },
  card: {
    width: "360px",
    padding: "35px",
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    textAlign: "center",
  },
  iconBox: {
    marginBottom: "10px",
  },
  title: {
    marginBottom: "5px",
    color: "#333",
  },
  subtitle: {
    marginBottom: "25px",
    fontSize: "14px",
    color: "#777",
  },
  error: {
    color: "red",
    fontSize: "13px",
    marginBottom: "10px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  passwordBox: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #ccc",
    borderRadius: "6px",
    marginBottom: "20px",
  },
  passwordInput: {
    flex: 1,
    padding: "12px",
    border: "none",
    outline: "none",
    fontSize: "14px",
  },
  eyeIcon: {
    padding: "10px",
    cursor: "pointer",
    color: "#666",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    cursor: "pointer",
  },
  footerText: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#aaa",
  },
};

export default LoginPage;
