import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import NavBarRight from "../Component/Navbar"
import styles from "../styles/Layout.module.css";

export default function Layout({ children }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("displayName");
    if (!token) {
      router.push("/"); 
    } else {
      setDisplayName(name || "");
    }
  });

 

  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={140}
            height={30}
            className={styles.logo}
          />
        
        </div>
  <h1 className={styles.title}>WorkFlow Management</h1>
        <NavBarRight displayName={displayName}   />
      </nav>

      <main className={styles.pageContent}>{children}</main>
    </div>
  );
}
