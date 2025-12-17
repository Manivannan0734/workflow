import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Dropdown } from "semantic-ui-react";
import axiosInstance from "@/utilsJS/axiosInstance";
import ConfirmModal from "./Confirm";
import Toast from "./Toast";

const IssuesModal = ({ open, onClose, issue, onUpdated }) => {
  const [form, setForm] = useState({});
  const [original, setOriginal] = useState({});
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (issue) {
      setForm(issue);
      setOriginal(issue);
    }
  }, [issue]);

  useEffect(() => {
    if (open) {
      fetchAssignees();
    }
  }, [open]);

  const fetchAssignees = async () => {
  try {
    const res = await axiosInstance.get("/issues/assignees");

    const flatOptions = [
      { key: "header_users", text: "Users", disabled: true },
      ...res.data.users,   // [{ key, value, text }]
      { key: "header_groups", text: "Groups", disabled: true },
      ...res.data.groups
    ];

    setAssigneeOptions(flatOptions);
  } catch (err) {
    console.error("Failed to load assignees", err);
  }
};

  const hasChanges = JSON.stringify(form) !== JSON.stringify(original);

  const handleChange = (e, { name, value }) => {
    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    try {
      await axiosInstance.put(`/issues/${issue.subtask_id}`, {
        action: form.action,
        description: form.description,
        assignee: form.assignee,
      });
      setToast({ message: "Issue updated successfully", type: "success" });
      onUpdated();
      onClose();
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} size="small">
        <Modal.Header>Edit Issue</Modal.Header>
        <Modal.Content>
          <Form>
            <Form.Input
              label="Action"
              name="action"
              value={form.action || ""}
              onChange={handleChange}
            />
            <Form.TextArea
              label="Description"
              name="description"
              value={form.description || ""}
              onChange={handleChange}
            />
           <Form.Field>
  <label>Assignee</label>
  <Dropdown
    placeholder="Select User or Group"
    fluid
    search
    selection
    options={assigneeOptions}    
    value={form.assignee || ""}
    onChange={(e, { value }) =>
      setForm({ ...form, assignee: value })
    }
  />
</Form.Field>

          </Form>
        </Modal.Content>

        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            primary
            disabled={!hasChanges}
            onClick={() => setConfirmOpen(true)}
          >
            Save
          </Button>
        </Modal.Actions>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        header="Confirm Update"
        content="Save changes to this issue?"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default IssuesModal;
