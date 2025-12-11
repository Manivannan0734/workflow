// Updated TaskModal component: description and subtasks now rendered in table format.
// All other logic remains untouched.

import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Form, Icon, Dropdown, Segment, Header, Table } from "semantic-ui-react";
import axiosInstance from "../utilsJS/axiosInstance";
import { ForwardRefEditor } from "@/utilsJS/ForwardRefEditor";

const TaskModal = ({ open, mode = "create_simple", task = null, onClose, onTaskSaved }) => {
  const mapMode = (m) => {
    if (m === "template" || m === "create_template") return "create_template";
    if (m === "simple" || m === "create_simple") return "create_simple";
    if (m === "view") return "view";
    if (m === "edit") return "edit";
    return "create_simple";
  };

  const [internalMode, setInternalMode] = useState(mapMode(mode));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateId, setTemplateId] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [templateSubtasks, setTemplateSubtasks] = useState([]);
  const [taskSubtasks, setTaskSubtasks] = useState([]);

  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const editorRef = useRef(null);
  const templateEditorRef = useRef(null);

  const resetModalState = () => {
    setInternalMode(mapMode(mode));
    setName("");
    setDescription("");
    setTemplateDescription("");
    setTemplateId(null);
    setTemplateSubtasks([]);
    setTaskSubtasks([]);
  };

  const handleClose = () => {
    resetModalState();
    onClose?.();
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await axiosInstance.get("/templates/");
      const list = res.data.map((t) => ({
        key: t.id,
        text: t.name,
        value: t.id,
        description: t.label,
      }));
      setTemplates([{ key: "none", text: "None (Simple Task)", value: null }, ...list]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadTaskDetails = async (taskId) => {
    if (!taskId) return;

    try {
      const resTask = await axiosInstance.get(`/tasks/${taskId}`);
      const t = resTask.data;

      setName(t.name || "");
      setTemplateId(t.templateId ?? null);

      if (t.templateId) {
        setTemplateDescription(t.templateDescription || "");
        setTemplateSubtasks(t.taskSubtasks || []);
        setDescription("");
        setTaskSubtasks([]);
      } else {
        setDescription(t.description || "");
        setTaskSubtasks(t.taskSubtasks || []);
        setTemplateDescription("");
        setTemplateSubtasks([]);
      }
    } catch (err) {
      console.error("Failed to load task details", err);
    }
  };

  useEffect(() => {
    setInternalMode(mapMode(mode));
  }, [mode]);

  useEffect(() => {
    if (!open) return;

    if (internalMode === "create_template" || internalMode === "edit") loadTemplates();

    if ((internalMode === "view" || internalMode === "edit") && task?.id) {
      loadTaskDetails(task.id);
    } else {
      setName("");
      setDescription("");
      setTemplateDescription("");
      setTaskSubtasks([]);
      setTemplateSubtasks([]);
    }
  }, [open, internalMode, task]);

  const onTemplateChange = async (e, { value }) => {
    setTemplateId(value);
    if (value) setDescription("");
    try {
      if (!value) {
        setTemplateSubtasks([]);
        setTemplateDescription("");
        return;
      }
      const res = await axiosInstance.get(`/templates/${value}`);
      const template = res.data;
      setTemplateDescription(template.description || "");
      setTemplateSubtasks(
        (template.subtasks || []).map((st) => ({ ...st, originalSubId: st.id }))
      );
    } catch (err) {
      console.error("Failed to load template", err);
    }
  };

  const saveTask = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        templateId,
        description: templateId ? templateDescription : description,
        subtasks: templateId ? templateSubtasks : taskSubtasks,
      };

      if (internalMode === "edit") {
        await axiosInstance.put(`/tasks/${task.id}`, payload);
      } else {
        await axiosInstance.post("/tasks/", payload);
      }

      onTaskSaved?.();
      handleClose();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const renderEditableSubtask = (st, index, listSetter, listState) => {
    const update = (field, value) => {
      const updated = [...listState];
      updated[index] = { ...updated[index], [field]: value };
      listSetter(updated);
    };

    return (
      <Segment key={index}>
        <Form.Input label="Action" value={st.action} onChange={(e) => update("action", e.target.value)} />
        <Form.Field>
          <label>Description</label>
          <ForwardRefEditor markdown={st.description} onChange={(value) => update("description", value)} />
        </Form.Field>
        <Form.Input label="Assignee" value={st.assignee} onChange={(e) => update("assignee", e.target.value)} />
        <Form.Input label="Depends On" value={st.dependsOn || ""} onChange={(e) => update("dependsOn", e.target.value)} />
      </Segment>
    );
  };

const renderSubtaskTable = (list) => (
    <Table celled structured>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Action</Table.HeaderCell>
          <Table.HeaderCell>Description</Table.HeaderCell>
          <Table.HeaderCell>Assignee</Table.HeaderCell>
          <Table.HeaderCell>Depends On</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {list.map((st, idx) => (
          <Table.Row key={idx}>
            <Table.Cell>{st.action}</Table.Cell>
            <Table.Cell>
              <div dangerouslySetInnerHTML={{ __html: st.description }} />
            </Table.Cell>
            <Table.Cell>{st.assignee}</Table.Cell>
            <Table.Cell>{st.dependsOn || ""}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );

  return (
    <Modal open={open} onClose={handleClose} size="large">
      <Modal.Header>
        {internalMode === "create_template" && "Create Task from Template"}
        {internalMode === "create_simple" && "Create Simple Task"}
        {internalMode === "view" && "Task Details"}
        {internalMode === "edit" && "Edit Task"}
      </Modal.Header>

      <Modal.Content scrolling>
        <Form>
          <Form.Field>
            <label>Task Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} readOnly={internalMode === "view"} />
          </Form.Field>

          {(internalMode === "create_template" || internalMode === "edit") && (
            <Form.Field>
              <label>Select Template</label>
              <Dropdown
                selection
                fluid
                clearable
                options={templates}
                value={templateId ?? ""}
                onChange={onTemplateChange}
                disabled={internalMode === "view"}
              />
            </Form.Field>
          )}

          {!templateId && (
            <Form.Field>
              <label>Description</label>
              {internalMode === "view" ? (
                <Table celled><Table.Body><Table.Row><Table.Cell>
                  <div dangerouslySetInnerHTML={{ __html: description }} />
                </Table.Cell></Table.Row></Table.Body></Table>
              ) : (
                <ForwardRefEditor editorRef={editorRef} markdown={description} onChange={setDescription} />
              )}
            </Form.Field>
          )}

          {templateId && (
            <Form.Field>
              <Header as="h4" attached="top">Template Description (Saved in Task)</Header>
              {internalMode === "view" ? (
                <Table celled><Table.Body><Table.Row><Table.Cell>
                  <div dangerouslySetInnerHTML={{ __html: templateDescription }} />
                </Table.Cell></Table.Row></Table.Body></Table>
              ) : (
                <ForwardRefEditor
                  key={`template-editor-${templateId}-${Math.random()}`}
                  editorRef={templateEditorRef}
                  markdown={templateDescription}
                  onChange={setTemplateDescription}
                />
              )}
            </Form.Field>
          )}

          {templateId && templateSubtasks.length > 0 && (
            <>
              <Header as="h4" attached="top">Template Subtasks</Header>
              {internalMode === "view" ? renderSubtaskTable(templateSubtasks) : templateSubtasks.map((st, index) => renderEditableSubtask(st, index, setTemplateSubtasks, templateSubtasks))}
            </>
          )}

          {!templateId && taskSubtasks.length > 0 && (
            <>
              <Header as="h4" attached="top">Task Subtasks</Header>
              {internalMode === "view" ? renderSubtaskTable(taskSubtasks) : taskSubtasks.map((st, index) => renderEditableSubtask(st, index, setTaskSubtasks, taskSubtasks))}
            </>
          )}
        </Form>
      </Modal.Content>

      <Modal.Actions>
        {internalMode === "view" ? (
          <Button onClick={() => setInternalMode("edit")} color="blue">
            <Icon name="edit" /> Edit
          </Button>
        ) : (
          <Button color="green" onClick={saveTask} loading={saving} disabled={!name.trim()}>
            <Icon name="save" /> Save
          </Button>
        )}
        <Button onClick={handleClose}><Icon name="close" /> Close</Button>
      </Modal.Actions>
    </Modal>
  );
};

export default TaskModal;

//working code problem in subtask editing only 