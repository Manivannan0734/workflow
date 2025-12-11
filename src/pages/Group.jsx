"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/utilsJS/axiosInstance";
import { useRouter } from "next/router";
import EditGroupModal from "@/Component/EditGroupModal";
import ConfirmModal from "../Component/Confirm";
import Toast from "@/Component/Toast";
import LoadingSkeletonRows from "@/Component/Loading";

import {
  Button,
  Table,
  Icon,
  Header,
  Segment,
  Grid,
  Message,
  Container,
} from "semantic-ui-react";

const API_BASE = "/groups";

const Group = () => {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [membersEditing, setMembersEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmHeader, setConfirmHeader] = useState("");
  const [confirmContent, setConfirmContent] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/Login");
  }, [router]);

  const fetchAllUsers = async () => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/users`);
      setAllUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${API_BASE}/`);
      const groupsData = res.data;

      const membersList = await Promise.all(
        groupsData.map(async (g) => {
          const mRes = await axiosInstance.get(`${API_BASE}/${g.id}/members`);
          return { groupId: g.id, members: mRes.data.map((m) => m.id) };
        })
      );

      const initialMembers = {};
      membersList.forEach((m) => {
        initialMembers[m.groupId] = m.members;
      });

      setMembersEditing(initialMembers);
      setGroups(groupsData);
      setLoading(false);
      setHasChanges(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
    fetchGroups();
  }, []);

  const goBack = () => router.push("/Landing");

  const handleDeleteGroup = (groupId, groupName) => {
    setConfirmHeader("Delete Group");
    setConfirmContent(`Are you sure you want to delete "${groupName}"?`);
    setConfirmAction(() => () => confirmDelete(groupId));
    setConfirmOpen(true);
    setHasChanges(true);
  };

  const confirmDelete = async (groupId) => {
    try {
      await axiosInstance.put(`${API_BASE}/delete/${groupId}`);
      fetchGroups();
      setConfirmOpen(false);
      setHasChanges(false);
      setToastMessage({ text: "Group deleted successfully!", type: "success" });
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveMembers = async (groupId, updatedMembers) => {
    try {
      await axiosInstance.put(`${API_BASE}/update_members/${groupId}`, {
        userIds: updatedMembers,
      });
      setMembersEditing((prev) => ({ ...prev, [groupId]: updatedMembers }));
      fetchGroups();
      setToastMessage({ text: "Group members updated successfully!", type: "success" });
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (error) {
    return (
      <Container textAlign="center" style={{ marginTop: "2rem" }}>
        <Message negative>
          <Message.Header>Error</Message.Header>
          <p>{error}</p>
        </Message>
      </Container>
    );
  }

  return (
    <Container style={{ marginTop: "2rem" }}>
      <Segment raised  style={{ borderRadius: "14px" }}>
        
        <Grid>
          <Grid.Row columns={2} verticalAlign="middle">
            <Grid.Column width={8}>
              <Button
                color="green"
                icon
                labelPosition="left"
                onClick={goBack}
                style={{ backgroundColor: "#5f3d97ff" }}
              >
                <Icon name="arrow left" />
                Back
              </Button>
            </Grid.Column>
            <Grid.Column textAlign="right" width={8}>
              <Button
                color="green"
                icon
                labelPosition="left"
                style={{ backgroundColor: "#5f3d97ff" }}
                onClick={() => setModalOpen(true)}
              >
                <Icon name="edit" />
                Edit Groups
              </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>

        <Header
          as="h2"
          textAlign="center"
          style={{ marginTop: "1.5rem", color: "#333" }}
        >
          Groups List
        </Header>

        {/* Table */}
        <Segment basic style={{ overflowX: "auto" }}>
          <Table celled striped selectable textAlign="center">
            <Table.Header  >
              <Table.Row >
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2}>Name</Table.HeaderCell>
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2}>Created By</Table.HeaderCell>
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2}>Created At</Table.HeaderCell>
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Members</Table.HeaderCell>
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Email</Table.HeaderCell>
                <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
  {loading ? (
    <LoadingSkeletonRows rows={3} columns={6} />
  ) : groups.length > 0 ? (
    groups.map((g) => (
      <Table.Row key={g.id}>
        <Table.Cell>{g.name}</Table.Cell>
        <Table.Cell>{g.createdBy}</Table.Cell>
        <Table.Cell>{new Date(g.createdAt).toLocaleString()}</Table.Cell>
        <Table.Cell>
          {allUsers
            .filter((u) => membersEditing[g.id]?.includes(u.id))
            .map((u, index) => (
              <span key={u.id}>
                {u.name} ({u.email || "No Email"})
                {index < membersEditing[g.id].length - 1 ? ", " : ""}
              </span>
            ))}
        </Table.Cell>
        <Table.Cell>{g.email}</Table.Cell>
        <Table.Cell>
          <Button
            icon
            color="red"
            onClick={() => handleDeleteGroup(g.id, g.name)}
          >
            <Icon name="trash" />
          </Button>
        </Table.Cell>
      </Table.Row>
    ))
  ) : (
    <Table.Row>
      <Table.Cell colSpan="6"  textAlign="center">
        No groups found.
      </Table.Cell>
    </Table.Row>
  )}
</Table.Body>

          </Table>
        </Segment>
      </Segment>

      {/* Edit Group Modal */}
      <EditGroupModal
        group={selectedGroup}
        allGroups={groups}
        allUsers={allUsers}
        groupMembersMap={membersEditing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveMembers}
        setSelectedGroup={setSelectedGroup}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setHasChanges(false);
        }}
        onConfirm={() => confirmAction && confirmAction()}
        header={confirmHeader}
        content={confirmContent}
        disabled={!hasChanges}
      />

 
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage("")}
        />
      )}
    </Container>
  );
};

export default Group;
