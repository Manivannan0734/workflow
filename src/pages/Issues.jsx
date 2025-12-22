//note for dev in future the edit mode is connected with task model both are same func so executed liek thsi 
import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/utilsJS/axiosInstance";
import { Table, Loader, Button, Icon } from "semantic-ui-react";
import { useRouter } from "next/router";
import TaskModal from "../Component/TaskModal";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import Link from "next/link";
const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [assigneeMap, setAssigneeMap] = useState({});
  const router = useRouter();

  const markdownSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      a: ["href", "title", "target", "rel"],
    },
  };

  // 1. Function to fetch data from API
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/issues/");
      setIssues(res.data);
    } catch (err) {
      console.error("Error fetching issues", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssigneeMap = async () => {
    try {
      const res = await axiosInstance.get("/issues/assignees");
      const map = {};
      [...res.data.users, ...res.data.groups].forEach((o) => {
        map[o.value] = o.text;
      });
      setAssigneeMap(map);
    } catch (err) {
      console.error("Failed to load assignee map", err);
    }
  };

  useEffect(() => {
    fetchIssues();
    fetchAssigneeMap();
  }, [fetchIssues]);

  const openTaskDetails = (taskId) => {
    if (!taskId) return;
 
    setSelectedTask({ id: taskId }); 
    setTaskModalOpen(true);
  };

  const handleBack = () => router.push("/Landing");
  const formatAssignee = (assignee) => assigneeMap[assignee] || assignee || "-";

  if (loading) return <Loader active />;

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Issues</h1>

      <Button
        style={{ backgroundColor: "#5f3d97ff", color: "#fff", height: "40px", marginBottom: "20px" }}
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
                Action Name
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
                Task Name
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
                Description
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>
                Assignee
              </Table.HeaderCell>
             
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {issues.map((item) => (
              <Table.Row key={item.subtask_id}>
                <Table.Cell>{item.action}</Table.Cell>
                <Table.Cell>
  <span
    onClick={() => openTaskDetails(item.task_id)}
    style={{
      color: "#0191ffff",
      cursor: "pointer",
      textDecoration: "underline",
      fontWeight: "500",
    }}
    title="Open Task"
  >
    {item.action}
  </span>


  {/* <Link style={{textDecoration:"underline",color:"blue"}} href="/TasksList">{item.action}</Link> */}


</Table.Cell>


                <Table.Cell>
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
                  >
                    {item.description || ""}
                  </ReactMarkdown>
                </Table.Cell>

                <Table.Cell>{formatAssignee(item.assignee)}</Table.Cell>

                 
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* TASK MODAL HANDLES BOTH VIEWING AND EDITING */}
      {taskModalOpen && (
        <TaskModal
          open={taskModalOpen}
          mode="view"
          task={selectedTask}
          onClose={() => {
            setTaskModalOpen(false);
            setSelectedTask(null);
          }}
          // 2. This callback triggers the re-render when TaskModal calls saveTask()
          onTaskSaved={fetchIssues} 
        />
      )}
    </div>
  );
};

export default Issues;