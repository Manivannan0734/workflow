import React, { useState } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import styles from "../styles/Nav.module.css";
import ConfirmModal from "@/Component/Confirm";  
 
export default function NavBarRight({ displayName = "", onLogout }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  
  const handleLogoutClick = () => {
    setConfirmOpen(true);
  };

  
  const handleConfirmLogout = () => {
    setConfirmOpen(false);
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("displayName");
      localStorage.removeItem("activeUserPage")
      router.push("/");
    }
  };

  return (
    <div className={styles.navRight}>
      <span className={styles.username}>
        <FontAwesomeIcon icon={faUser} size="lg" />{" "}
        <span className={styles.nameText}>{displayName}</span>
      </span>
      <button className={styles.logoutButton} onClick={handleLogoutClick}>
        Logout
      </button>


      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        header="Logout Confirmation"
        content="Are you sure you want to logout?"
      />
    </div>
  );
}
