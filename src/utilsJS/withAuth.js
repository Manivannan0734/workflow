import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axiosInstance from "@/utilsJS/axiosInstance";
import Loading from "@/Component/Loading";
import ConfirmModal from "@/Component/Confirm";

export default function withAuth(WrappedComponent) {
  return function AuthComponent(props) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);  
    const [isVerified, setIsVerified] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmHeader, setConfirmHeader] = useState("");
    const [confirmContent, setConfirmContent] = useState("");
    const [onConfirmAction, setOnConfirmAction] = useState(null);

    useEffect(() => {
      setMounted(true);  
      const token = localStorage.getItem("token");
      if (!token) {
        setConfirmHeader("Login Required");
        setConfirmContent("You need to login before accessing this page.");
        setOnConfirmAction(() => () => router.push("/Login"));
        setConfirmOpen(true);
        return;
      }

      axiosInstance
        .get("/check-session")
        .then((res) => {
          if (res.data?.success) {
            setIsVerified(true);
          } else {
            throw new Error("Invalid session");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          setConfirmHeader("Session Expired");
          setConfirmContent("Your session has expired. Please login again.");
          setOnConfirmAction(() => () => router.push("/Login"));
          setConfirmOpen(true);
        });
    }, [router]);

    //prevent hydration mismatch
    
    if (!mounted) return null;

    if (!isVerified) {
      return (
        <>
          <Loading />
          <ConfirmModal
            open={confirmOpen}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              if (onConfirmAction) onConfirmAction();
            }}
            header={confirmHeader}
            content={confirmContent}
          />
        </>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
