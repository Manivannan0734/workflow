import React, { useEffect, useState } from "react";

const Toast = ({ message, type = "success", duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
     
    setVisible(true);

    
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const backgroundColor =
    type === "success" ? "#71d13d" : type === "error" ? "#e74c3c" : "#333";

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s, transform 0.5s",
      }}
    >
      {message}
    </div>
  );
};

const styles = {
  toast: {
    position: "fixed",
    bottom: "30px",
    right: "30px",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontWeight: "bold",
    zIndex: 9999,
  },
};

export default Toast;
