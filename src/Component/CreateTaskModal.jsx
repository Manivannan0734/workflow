// CreateTaskModal.jsx
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Dropdown, Message } from "semantic-ui-react";
import axiosInstance from "../utilsJS/axiosInstance"; // adjust path as needed

const CreateTaskModal = ({ open, onClose, onTaskCreated }) => {
  const [taskName, setTaskName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Read displayName from localStorage (assumed key "displayName")
  const [displayName, setDisplayName] = useState("");


  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);



useEffect(() => {
  if (typeof window !== "undefined") {
    const name = localStorage.getItem("displayName") || "";
    setDisplayName(name);
  }
}, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    setError(null);
    try {
      const res = await axiosInstance.get("/templates/");
      // assume res.data is an array of templates with {id, name, ...}
      setTemplates(
        res.data.map((t) => ({
          key: t.id,
          value: t.id,
          text: t.name,
        }))
      );
    } catch (err) {
      console.error("Failed to load templates", err);
      setError("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const resetForm = () => {
    setTaskName("");
    setTemplateId(null);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    if (!taskName?.trim()) {
      setError("Task name is required");
      return;
    }
    if (!templateId) {
      setError("Please select a template");
      return;
    }

    setSaving(true);
    try {
      // payload: name, templateId. createdBy will be set by backend from token_user (see note)
      const payload = {
        name: taskName.trim(),
        templateId: templateId,
        // createdBy: displayName  // optional: backend currently ignores this field
      };

      const res = await axiosInstance.post("/tasks/", payload);
      // Success
      resetForm();
      onTaskCreated && onTaskCreated(res.data); // parent can refresh tasks list
      onClose && onClose();
    } catch (err) {
      console.error("Failed to create task", err);
      // Try to extract message
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create task";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose && onClose();
  };

  return (
    <Modal open={open} onClose={handleCancel} closeIcon>
      <Modal.Header>Create New Task</Modal.Header>
      <Modal.Content>
        {error && <Message negative content={error} />}
        <Form>
          <Form.Field>
            <label>Task Name</label>
            <input
              placeholder="Enter task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </Form.Field>

          <Form.Field>
            <label>Template</label>
            <Dropdown
              placeholder={loadingTemplates ? "Loading templates..." : "Select template"}
              fluid
              selection
              options={templates}
              value={templateId}
              onChange={(_, { value }) => setTemplateId(value)}
              loading={loadingTemplates}
              noResultsMessage="No templates"
            />
          </Form.Field>

          <Form.Field>
            <label>Created By</label>
            <input value={displayName} readOnly />
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              CreatedBy is taken from localStorage (key: "displayName"). Note: backend currently
              sets createdBy from authenticated user on server side.
            </div>
          </Form.Field>
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button primary onClick={handleSave} loading={saving} disabled={saving}>
          Save
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default CreateTaskModal;
