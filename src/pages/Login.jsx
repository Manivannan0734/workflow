import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import styles from "@/styles/Login.module.css";
import axiosInstance from "@/utilsJS/axiosInstance";
import { Icon } from "semantic-ui-react";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axiosInstance.post("http://localhost:8000/api/login", {
        email,
        password,
      });

      const data = res.data;

      if (res.status === 200 && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("displayName", data.displayName);
        router.push("/Landing");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={200}
          height={60}
          className={styles.logo}
        />
        <h1 className={styles.title}>WorkFlow Management</h1>
      </header>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Login</h2>
        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className={styles.passwordWrapper}>
  <input
    className={styles.input}
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
  />

  <span
    className={styles.eyeIcon}
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ?<Icon name="eye icon" /> :   <Icon name="eye slash icon" /> }
  </span>
</div>

          <button className={styles.button} type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
