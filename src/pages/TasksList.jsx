import React, { useEffect, useState } from "react";
import { Table, Button, Icon, Segment, Loader } from "semantic-ui-react";
import axiosInstance from "../utilsJS/axiosInstance";
import TaskModal from "../Component/TaskModal";
import Toast from "../Component/Toast";
import ConfirmModal from "../Component/Confirm";
import { useRouter } from "next/router";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("simple"); // simple | template | view | edit
  const [taskToEdit, setTaskToEdit] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/tasks/");
      setTasks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (mode) => {
    setModalMode(mode);
    setTaskToEdit(null);
    setModalOpen(true);
  };

  const openViewModal = (task) => {
    setTaskToEdit(task); // Pass full task object
    setModalMode("view");
    setModalOpen(true);
  };

  const confirmDelete = (id) => {
    setTaskToDelete(id);
    setConfirmOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/tasks/${id}`);
      setToast({ message: "Task deleted successfully", type: "success", visible: true });
      fetchTasks();
    } catch (err) {
      console.error("Delete failed", err);
      setToast({ message: "Failed to delete task", type: "error", visible: true });
    } finally {
      setConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleBack = () => {
    router.push("/Landing");
  };

  return (
    <Segment>
      <h3 style={{ textAlign: "center" }}>Tasks</h3>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <Button
            style={{ backgroundColor: "#5f3d97ff", color: "#fff", height: "40px" }}
            onClick={handleBack}
          >
            <Icon name="left arrow" /> Back
          </Button>
          <Button
            style={{ backgroundColor: "#5f3d97ff", color: "#fff", height: "40px", marginLeft: 8 }}
            onClick={() => openCreateModal("template")}
          >
            <Icon name="plus" /> Create Template Task
          </Button>
          <Button
            style={{ backgroundColor: "#5f3d97ff", color: "#fff", height: "40px", marginLeft: 8 }}
            onClick={() => openCreateModal("simple")}
          >
            <Icon name="plus" /> Create Simple Task
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader active inline="centered" />
      ) : (
        <Table celled striped>
          <Table.Header>
            <Table.Row style={{ textAlign: "center" }}>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Name</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Template</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Created By</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Created On</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {tasks.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan="6" textAlign="center">No tasks found.</Table.Cell>
              </Table.Row>
            ) : (
              tasks.map((t) => (
                <Table.Row key={t.id}>
                  <Table.Cell>{t.name}</Table.Cell>
                  <Table.Cell>{t.templateName ?? (t.templateId ? `#${t.templateId}` : "(Simple)")}</Table.Cell>
                  <Table.Cell>{t.createdBy}</Table.Cell>
                  <Table.Cell>{t.createdOn ? new Date(t.createdOn).toLocaleString() : "-"}</Table.Cell>
                  <Table.Cell textAlign="center">
                    <Button icon color="blue" size="small" title="Open" onClick={() => openViewModal(t)}>
                      <Icon name="folder open" />
                    </Button>
                    <Button icon color="red" size="small" title="Delete" onClick={() => confirmDelete(t.id)}>
                      <Icon name="trash" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      )}

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        task={taskToEdit}
        onClose={() => setModalOpen(false)}
        onTaskSaved={() => {
          fetchTasks();
          setToast({ message: "Saved Successfully", type: "success", visible: true });
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => handleDelete(taskToDelete)}
        header="Delete Task"
        content="Are you sure you want to delete this task?"
      />

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </Segment>
  );
};

export default TaskList;
