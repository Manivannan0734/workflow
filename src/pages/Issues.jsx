import React, { useEffect, useState } from "react";
import axiosInstance from "@/utilsJS/axiosInstance";
import { Table, Loader, Button, Icon } from "semantic-ui-react";
import { useRouter } from "next/router";
import IssuesModal from "../Component/IssuesModal";

const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await axiosInstance.get("/issues/");
      setIssues(res.data);
    } catch (err) {
      console.error("Error fetching issues", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/Landing");
  };

  if (loading) return <Loader active />;

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Issues</h1>
      <Button
        style={{ backgroundColor: "#5f3d97ff", color: "#fff", height: "40px" }}
        onClick={handleBack}
      >
        <Icon name="left arrow" /> Back
      </Button>

     {issues.length === 0 ? (
  <div style={{ textAlign: "center", marginTop: "20px", fontWeight: "bold" }}>
    No tasks found
  </div>
) : (
  <Table celled striped>
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
          Task Name
        </Table.HeaderCell>
        <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
          Action
        </Table.HeaderCell>
        <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
          Description
        </Table.HeaderCell>
        <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
          Assignee
        </Table.HeaderCell>
        <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
          Edit
        </Table.HeaderCell>
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {issues.map((item) => (
        <Table.Row key={item.subtask_id}>
          <Table.Cell>{item.task_name}</Table.Cell>
          <Table.Cell>{item.action}</Table.Cell>
          <Table.Cell>{item.description}</Table.Cell>
          <Table.Cell>{item.assignee}</Table.Cell>
          <Table.Cell>
            <Button
              icon="edit"
              size="small"
              onClick={() => {
                setSelectedIssue(item);
                setModalOpen(true);
              }}
            />
          </Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
)}


      {modalOpen && (
        <IssuesModal
          open={modalOpen}
          issue={selectedIssue}
          onClose={() => setModalOpen(false)}
          onUpdated={fetchIssues}
        />
      )}
    </div>
  );
};

export default Issues;
