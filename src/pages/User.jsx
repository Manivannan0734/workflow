 
import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/utilsJS/axiosInstance";
import { useRouter } from "next/router";
import {
  Button,
  Checkbox,
  Container,
  Header,
  Icon,
  Segment,
  Table,
} from "semantic-ui-react";


import LoadingSkeletonRows from "@/Component/Loading";
import ConfirmModal from "@/Component/Confirm";
import Toast from "@/Component/Toast";
import EditUserModal from "@/Component/EditUserModal";
import Pagination from "@/Component/Pagination";

const API_BASE = "/users";

 
const getInitialPage = () => {
  if (typeof window !== "undefined") {
    const savedPage = localStorage.getItem("activeUserPage");
    return savedPage ? Number(savedPage) : 1;
  }
  return 1;
};

 
const User = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activePage, setActivePage] = useState(getInitialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmState, setConfirmState] = useState({
    open: false,
    action: null,
    header: "",
    content: "",
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [editingFields, setEditingFields] = useState({});
  const [pageSize, setPageSize] = useState(5); 

 
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/Login");
      return;
    }
    localStorage.setItem("activeUserPage", activePage.toString());
  }, [router, activePage]);

   
  const fetchUsers = useCallback(
    async (page, signal) => {
      const pageToFetch = Math.max(1, Math.min(page, totalPages || 1));
      try {
        setLoading(true);
        const res = await axiosInstance.get(`${API_BASE}/all`, {
          params: { showDeleted, page: pageToFetch, limit: pageSize },
          signal,
        });

        const { users: fetchedUsers, pagination } = res.data;
        setUsers(fetchedUsers);
        setTotalPages(pagination.totalPages || 1);
        setActivePage(pagination.currentPage || pageToFetch);

        const initialEditing = fetchedUsers.reduce((acc, user) => {
          acc[user.id] = {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            displayName: user.displayName || "",
            email: user.email || "",
            dept: user.dept || "",
            updateSource: user.updateSource || "",
          };
          return acc;
        }, {});
        setEditingFields(initialEditing);
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setError(err.response?.data?.message || err.message || "Failed to fetch users.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [showDeleted, totalPages, pageSize]
  );

 
  useEffect(() => {
    const controller = new AbortController();
    let pageToFetch = activePage;

    if (activePage === 1 && !showDeleted) {
      pageToFetch = getInitialPage();
    }
    const finalPage = Math.min(pageToFetch, totalPages || 1);
    fetchUsers(finalPage, controller.signal);
    return () => controller.abort();
  }, [activePage, showDeleted, refetchTrigger, pageSize]);

  
  const goBack = useCallback(() => router.push("/Landing"), [router]);

  const handlePageChange = useCallback((_, { activePage: newPage }) => {
    setActivePage(newPage);
  }, []);

 
  const handleDeleteUser = useCallback((userId, displayName) => {
    setConfirmState({
      open: true,
      header: "Delete User",
      content: `Are you sure you want to delete ${displayName}?`,
      action: () => confirmDelete(userId),
    });
  }, []);

  const confirmDelete = useCallback(
    async (userId) => {
      setConfirmState((prev) => ({ ...prev, open: false }));
      try {
        await axiosInstance.put(`${API_BASE}/delete/${userId}`);
        setRefetchTrigger((prev) => prev + 1);
        setToastMessage({ text: "User deleted successfully!", type: "success" });
      } catch (err) {
        setToastMessage({
          text: err.response?.data?.message || "Failed to delete user",
          type: "error",
        });
      }
    },
    [setRefetchTrigger]
  );

 
  const handleSaveUser = useCallback(async (userId, updatedFields) => {
    try {
      const res = await axiosInstance.put(`${API_BASE}/update/${userId}`, updatedFields);
      const updatedUser = res.data;

      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, ...updatedUser } : u))
      );
      setEditingFields((prev) => ({ ...prev, [userId]: updatedFields }));
      setToastMessage({ text: "User updated successfully!", type: "success" });
    } catch (err) {
      setToastMessage({
        text: err.response?.data?.message || "Failed to update user",
        type: "error",
      });
    }
  }, []);

  const {
    open: confirmOpen,
    action: confirmAction,
    header: confirmHeader,
    content: confirmContent,
  } = confirmState;
 
  return (
    <Container style={{ marginTop: "3em", marginBottom: "3em" }}>
      <Segment
        raised
        style={{
          borderRadius: "14px",
          padding: "30px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
          backgroundColor: "#f8f9fa",
        }}
      >
        
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              color="green"
              onClick={goBack}
              icon
              labelPosition="left"
              style={{ backgroundColor: "#5f3d97ff" }}
            >
              <Icon name="arrow left" />
              Back
            </Button>
            <Button
              color="green"
              icon
              labelPosition="left"
              onClick={() => setModalOpen(true)}
              style={{ backgroundColor: "#5f3d97ff" }}
            >
              <Icon name="edit" />
              Edit Users
            </Button>
            <Button
              color="green"
              icon
              labelPosition="left"
              onClick={() => router.push("/Register")}
              style={{ backgroundColor: "#5f3d97ff" }}
            >
              <Icon name="user plus" />
              Register User
            </Button>
          </div>

          <Checkbox
            label="Show Deleted Users"
            checked={showDeleted}
            onChange={() => {
              setShowDeleted((prev) => !prev);
              setActivePage(1);
            }}
            style={{ fontSize: "15px", fontWeight: "500" }}
          />
        </div>

        <Header as="h1" textAlign="center" style={{ color: "#333", fontSize: "28px" }}>
          Users List
        </Header>

   
        <div style={{ marginTop: "20px" }}>
          <Table celled striped compact definition>
            <Table.Header>
              <Table.Row>
                {[
                  "ID",
                  "First Name",
                  "Last Name",
                  "Display Name",
                  "Email",
                  "Department",
                  "Update Source",
                  "Created At",
                  "Actions",
                ].map((header) => (
                  <Table.HeaderCell
                    key={header}
                    style={{ backgroundColor: "#5f3d97ff", color: "white",textAlign:"center" }}
                 
                  >
                    {header}
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {loading ? (
                <LoadingSkeletonRows rows={pageSize} />
              ) : error ? (
                <Table.Row>
                  <Table.Cell colSpan="9" textAlign="center" style={{ color: "red" }}>
                    {error}
                  </Table.Cell>
                </Table.Row>
              ) : users.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan="9" textAlign="center">
                    No users found.
                  </Table.Cell>
                </Table.Row>
              ) : (
                users.map((user) => (
                  <Table.Row key={user.id} style={{ opacity: user.isDeleted ? 0.5 : 1 }}>
                    <Table.Cell>{user.id}</Table.Cell>
                    <Table.Cell>{user.firstName}</Table.Cell>
                    <Table.Cell>{user.lastName}</Table.Cell>
                    <Table.Cell>{user.displayName}</Table.Cell>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>{user.dept}</Table.Cell>
                    <Table.Cell>{user.updateSource}</Table.Cell>
                    <Table.Cell>{new Date(user.createdAt).toLocaleString()}</Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button
                        icon
                        color="red"
                        size="small"
                        onClick={() => handleDeleteUser(user.id, user.displayName)}
                        disabled={user.isDeleted}
                      >
                        <Icon name="trash" />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>

       
          {totalPages > 1 && (
            <Pagination
              activePage={activePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setActivePage(1);
              }}
            />
          )}
        </div>
      </Segment>

     
      <EditUserModal
        allUsers={users}
        userFieldsMap={editingFields}
        setEditingFields={setEditingFields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveUser}
      />

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={() => confirmAction && confirmAction()}
        header={confirmHeader}
        content={confirmContent}
      />

      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </Container>
  );
};

export default User;