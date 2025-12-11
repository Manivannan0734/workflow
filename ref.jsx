"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Form,
  Table,
  Icon,
  Message,
  Dropdown,
} from "semantic-ui-react";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import axiosInstance from "@/utilsJS/axiosInstance";
import Toast from "@/Component/Toast";
import ConfirmModal from "@/Component/Confirm";
import LoadingSkeletonRows from "@/Component/Loading";

import { ForwardRefEditor } from "../utilsJS/ForwardRefEditor";

const TemplateModal = ({ open, onClose, onSuccess, selectedTemplate }) => {
  const isEdit = Boolean(selectedTemplate);
  const [fields, setFields] = useState({
    name: "",
    description: "",
    createdBy: "",
    label: "",
  });
  const [editMode, setEditMode] = useState(false);

  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [isChanged, setIsChanged] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);

  const parseDeps = (depStr) => {
    if (!depStr) return [];
    if (Array.isArray(depStr)) return depStr.map((d) => (d || "").toString().trim()).filter(Boolean);
    return (depStr || "").toString().split(",").map((s) => s.trim()).filter(Boolean);
  };

  const joinDeps = (depsArr) => {
    if (!depsArr || depsArr.length === 0) return "";
    return depsArr.map((d) => d.toString().trim()).filter(Boolean).join(",");
  };

  useEffect(() => {
    if (!open) {
      setFields({ name: "", description: "", label: "", createdBy: "" });
      setSubtasks([]);
      setError("");
      setIsChanged(false);
      setEditMode(false);
      return;
    }

    const initialize = async () => {
      try {
        setLoading(true);
        if (isEdit && selectedTemplate?.id) {
          const { data } = await axiosInstance.get(`/templates/${selectedTemplate.id}`);
          const loggedUser = localStorage.getItem("displayName") || "";

          setFields({
            name: data.name || "",
            description: data.description || "",
            label: data.label || "",
            createdBy: data.createdBy || loggedUser,
          });

          const normalizedSubtasks = (data.subtasks || []).map((st, idx) => {
            let assigneeVal = st.assignee ?? "";
            if (typeof assigneeVal === "number") assigneeVal = `user_${assigneeVal}`;
            else if (typeof assigneeVal === "string") {
              if (/^user:?\d+$/i.test(assigneeVal)) assigneeVal = assigneeVal.replace(/[:]/, "_");
              else if (/^group:?\d+$/i.test(assigneeVal)) assigneeVal = assigneeVal.replace(/[:]/, "_");
              else if (/^\d+$/.test(assigneeVal)) assigneeVal = `user_${assigneeVal}`;
            }

            return {
              __id: `subtask-${selectedTemplate.id || "t"}-${idx}-${Date.now() + idx}`,
              action: st.action || "",
              dependsOn: st.dependsOn || "",
              description: st.description || "",
              assignee: assigneeVal || "",
            };
          });

          setSubtasks(normalizedSubtasks);
          setIsChanged(false);
        } else {
          const loggedUser = localStorage.getItem("displayName") || "";
          setFields({
            name: "",
            description: "",
            createdBy: loggedUser,
            label: "",
          });
          setSubtasks([]);
        }

        await Promise.all([fetchUsers(), fetchGroups()]);
      } catch (err) {
        console.error(err);
        setError("Failed to load template details");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [open, selectedTemplate, isEdit]);

  const fetchUsers = async () => {
    try {
      const { data } = await axiosInstance.get("/groups/users");
      setUsersList(data || []);
      return data;
    } catch (err) {
      console.error("fetchUsers error", err);
      setUsersList([]);
      return [];
    }
  };

  const fetchGroups = async () => {
    try {
      const { data } = await axiosInstance.get("/groups/");
      setGroupsList(data || []);
      return data;
    } catch (err) {
      console.error("fetchGroups error", err);
      setGroupsList([]);
      return [];
    }
  };

  const markChanged = () => setIsChanged(true);

  const handleChange = (e, { name, value }) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    markChanged();
  };

  const handleSubtaskChange = (index, field, value) => {
    if (field === "dependsOn") {
      const valueArray = Array.isArray(value) ? value : parseDeps(value);
      const newValStr = joinDeps(valueArray);

      if (index === 0 && newValStr) {
        setShowToast({ message: "First task cannot have a Depends On. It must be N/A.", type: "error" });
        return;
      }

      const selfAction = (subtasks[index]?.action || "").toString().trim();
      if (selfAction && valueArray.some((v) => v.toString().trim() === selfAction)) {
        setShowToast({ message: `Task ${index + 1}: "Depends On" cannot match its own Action.`, type: "error" });
        return;
      }

      if (valueArray.length > 0) {
        const earlierActions = subtasks.slice(0, index).map((s) => (s.action || "").toString()).filter(Boolean);
        const invalid = valueArray.find((v) => !earlierActions.includes((v || "").toString()));
        if (invalid) {
          setShowToast({ message: `Task ${index + 1}: "Depends On" must reference action(s) from previous tasks only.`, type: "error" });
          return;
        }
      }

      setSubtasks((prev) => prev.map((st, i) => (i === index ? { ...st, [field]: newValStr } : st)));
      markChanged();
      return;
    }

    setSubtasks((prev) => prev.map((st, i) => (i === index ? { ...st, [field]: value } : st)));
    markChanged();
  };

  const addSubtask = () => {
    setSubtasks((prev) => [
      ...prev,
      {
        __id: `subtask-new-${Date.now()}-${prev.length}`,
        action: "",
        dependsOn: "",
        description: "",
        assignee: "",
      },
    ]);
    markChanged();
  };

  const removeSubtask = (index) => {
    setConfirmPayload({ index, message: "Are you sure you want to remove this subtask?" });
    setConfirmOpen(true);
  };

  const confirmRemove = () => {
    if (confirmPayload?.index !== undefined) {
      const delIndex = confirmPayload.index;
      setSubtasks((prev) => {
        const toDelete = prev[delIndex];
        const deletedAction = (toDelete?.action || "").toString().trim();
        const filtered = prev.filter((_, i) => i !== delIndex);

        if (!deletedAction) {
          return filtered.map((st, idx) => (idx === 0 ? { ...st, dependsOn: "" } : st));
        }

        return filtered.map((st, idx) => {
          const deps = parseDeps(st.dependsOn);
          const newDeps = deps.filter((d) => d !== deletedAction);
          if (idx === 0) return { ...st, dependsOn: "" };
          return { ...st, dependsOn: joinDeps(newDeps) };
        });
      });

      setConfirmOpen(false);
      setConfirmPayload(null);
      markChanged();
    }
  };

  const validateBeforeSave = () => {
    if (!fields.name.trim() || !fields.description.trim() || !fields.label.trim()) {
      setShowToast({ message: "Please fill all required fields", type: "error" });
      return false;
    }

    const actionDependsMap = {};

    for (let i = 0; i < subtasks.length; i++) {
      const { action = "", dependsOn = "", assignee = "", description = "" } = subtasks[i];
      if (!action || !action.trim()) {
        setShowToast({ message: `Subtask ${i + 1}: Action is required.`, type: "error" });
        return false;
      }
      if (!description || !description.trim()) {
        setShowToast({ message: `Subtask ${i + 1}: description is required.`, type: "error" });
        return false;
      }
      if (!assignee || !assignee.toString().trim()) {
        setShowToast({ message: `Subtask ${i + 1}: Please select an Assignee.`, type: "error" });
        return false;
      }

      const depsArr = parseDeps(dependsOn);
      if (i === 0 && depsArr.length > 0) {
        setShowToast({ message: `Subtask 1: First task cannot have a Depends On. It must be N/A.`, type: "error" });
        return false;
      }

      if (depsArr.length > 0) {
        const earlierActions = subtasks.slice(0, i).map((s) => (s.action || "").toString()).filter(Boolean);
        for (const dep of depsArr) {
          if (!earlierActions.includes(dep)) {
            setShowToast({ message: `Subtask ${i + 1}: "Depends On" must reference an action from a previous task.`, type: "error" });
            return false;
          }
        }
      }

      if (depsArr.length > 0 && action && depsArr.includes(action.toString())) {
        setShowToast({ message: `Subtask ${i + 1}: "Depends On" cannot match its own Action.`, type: "error" });
        return false;
      }

      const act = action.trim();
      if (!actionDependsMap[act]) actionDependsMap[act] = new Set();
      for (const dep of depsArr.length ? depsArr : [""]) {
        const depKey = dep.trim();
        if (actionDependsMap[act].has(depKey)) {
          setShowToast({ message: `Subtask ${i + 1}: Duplicate combination of Action and Depends On.`, type: "error" });
          return false;
        }
        actionDependsMap[act].add(depKey);
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...fields,
        subtasks: subtasks.map(({ __id, ...rest }) => rest),
      };

      if (isEdit) {
        await axiosInstance.put(`/templates/${selectedTemplate.id}`, payload);
        setShowToast({ message: "Template updated successfully!", type: "success" });
      } else {
        await axiosInstance.post("/templates/", payload);
        setShowToast({ message: "Template added successfully!", type: "success" });
      }

      setIsChanged(false);
      onSuccess?.();
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error(err);
      setShowToast({ message: "Failed to save template", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renderAssigneeControl = (st, index, editMode) => {
    const currentValue = st.assignee || "";
    const combinedOptions = [
      { key: "header_users", text: "Users", value: "", disabled: true },
      ...usersList.map((u) => ({ key: `user_${u.id}`, value: `user_${u.id}`, text: `${u.name || u.displayName || u.email || "User " + u.id}` })),
      { key: "header_groups", text: "Groups", value: "", disabled: true },
      ...groupsList.map((g) => ({ key: `group_${g.id}`, value: `group_${g.id}`, text: `${g.name || "Group " + g.id}` })),
    ];

    return (
      <Dropdown
        placeholder="Select Assignee"
        fluid
        selection
        search
        options={combinedOptions}
        value={currentValue}
        onChange={(e, { value }) => handleSubtaskChange(index, "assignee", value)}
        noResultsMessage="No users or groups found"
        disabled={!editMode}
      />
    );
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const newSubtasks = Array.from(subtasks);
    const [removed] = newSubtasks.splice(source.index, 1);
    newSubtasks.splice(destination.index, 0, removed);

    const invalidReason = (() => {
      if (newSubtasks.length > 0) {
        const firstDependsArr = parseDeps(newSubtasks[0].dependsOn);
        if (firstDependsArr.length > 0) return "First task cannot have a Depends On. Move not allowed.";
      }
      for (let i = 0; i < newSubtasks.length; i++) {
        const { action = "", dependsOn = "" } = newSubtasks[i];
        const act = (action || "").toString();
        const depArr = parseDeps(dependsOn);
        if (!act || !act.trim()) continue;
        if (depArr.length > 0) {
          if (depArr.includes(act)) return `Task ${i + 1}: "Depends On" cannot match its own Action. Move not allowed.`;
          const earlierActions = newSubtasks.slice(0, i).map((s) => (s.action || "").toString()).filter(Boolean);
          for (const dep of depArr) if (!earlierActions.includes(dep)) return `Task ${i + 1}: "Depends On" must reference an action that appears earlier. Move not allowed.`;
        }
      }
      return null;
    })();

    if (invalidReason) {
      setShowToast({ message: invalidReason, type: "error" });
      return;
    }

    setSubtasks(newSubtasks);
    markChanged();
  };

  return (
    <>
      {confirmOpen && confirmPayload && (
        <ConfirmModal
          open={confirmOpen}
          message={confirmPayload.message}
          onCancel={() => { setConfirmOpen(false); setConfirmPayload(null); }}
          onConfirm={confirmRemove}
        />
      )}

      {showToast && (
        <Toast
          message={showToast.message}
          type={showToast.type}
          duration={2500}
          onClose={() => setShowToast(null)}
        />
      )}

      <Modal open={open} onClose={onClose} size="large">
        <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
          <Button
            icon
            labelPosition="left"
            color={editMode ? "green" : "blue"}
            onClick={() => setEditMode(!editMode)}
            style={{ marginTop: "1em", position: "absolute", marginRight: "1em" }}
          >
            <Icon name={editMode ? "edit" : "eye"} />
            {editMode ? "Edit Mode" : "View Mode"}
          </Button>
        </div>

        <Modal.Header>{isEdit ? "Edit Template" : "Add New Template"}</Modal.Header>

        <Modal.Content scrolling>
          {loading ? (
            <table className="ui celled table">
              <tbody>
                <LoadingSkeletonRows rows={5} />
              </tbody>
            </table>
          ) : (
            <>
              {error && <Message negative content={error} />}

              <Form>
                <Form.Input
                  label="Template Name"
                  name="name"
                  value={fields.name}
                  onChange={handleChange}
                  required
                  disabled={!editMode}
                />

                <Form.Field>
                  <label>Description</label>
                  <div style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "6px", minHeight: "200px" }}>
                    <ForwardRefEditor
                      markdown={fields.description}
                      onChange={(value) => {
                        if (!editMode) return;
                        setFields((prev) => ({ ...prev, description: value }));
                        markChanged();
                      }}
                      readOnly={!editMode}
                    />
                  </div>
                </Form.Field>

                <Form.Group widths="equal">
                  <Form.Input
                    label="Created By"
                    name="createdBy"
                    value={fields.createdBy}
                    onChange={handleChange}
                    disabled
                  />

                  <Form.Select
                    label="Label"
                    name="label"
                    value={fields.label}
                    onChange={handleChange}
                    disabled={!editMode}
                    options={[
                      { key: "normal", text: "Normal", value: "Normal", label: { color: "blue", empty: true, circular: true } },
                      { key: "enquiry", text: "Enquiry", value: "Enquiry", label: { color: "yellow", empty: true, circular: true } },
                      { key: "urgent", text: "Urgent", value: "Urgent", label: { color: "red", empty: true, circular: true } },
                    ]}
                    placeholder="Select Label"
                    required
                  />
                </Form.Group>
              </Form>

              <h4 style={{ marginTop: "1em" }}>Subtasks (Drag to Reorder)</h4>

              <DragDropContext onDragEnd={editMode ? onDragEnd : () => {}}>
                <table className="ui celled compact table">
                  <thead>
                    <tr>
                      <Table.HeaderCell width={1} textAlign="center">Order</Table.HeaderCell>
                      <Table.HeaderCell width={3}>Action</Table.HeaderCell>
                      <Table.HeaderCell width={3}>Depends On</Table.HeaderCell>
                      <Table.HeaderCell width={5}>Description</Table.HeaderCell>
                      <Table.HeaderCell width={3}>Assignee</Table.HeaderCell>
                      {editMode && <Table.HeaderCell width={1}>Remove</Table.HeaderCell>}
                    </tr>
                  </thead>
                  <Droppable droppableId="subtasks">
                    {(provided) => (
                      <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {subtasks.map((st, index) => (
                          <Draggable key={st.__id} draggableId={st.__id} index={index} isDragDisabled={!editMode}>
                            {(provided) => (
                              <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <td>{index + 1}</td>
                                <td>
                                  <Form.Input
                                    value={st.action}
                                    onChange={(e, { value }) => handleSubtaskChange(index, "action", value)}
                                    disabled={!editMode}
                                  />
                                </td>
                                <td>
                                  <Form.Input
                                    value={st.dependsOn}
                                    onChange={(e, { value }) => handleSubtaskChange(index, "dependsOn", value)}
                                    disabled={!editMode}
                                    placeholder={index === 0 ? "N/A" : ""}
                                  />
                                </td>
                                <td>
                                  <div style={{ minHeight: "60px" }}>
                                    <ForwardRefEditor
                                      markdown={st.description}
                                      onChange={(val) => handleSubtaskChange(index, "description", val)}
                                      readOnly={!editMode}
                                    />
                                  </div>
                                </td>
                                <td>{renderAssigneeControl(st, index, editMode)}</td>
                                {editMode && (
                                  <td>
                                    <Button icon color="red" onClick={() => removeSubtask(index)}>
                                      <Icon name="trash" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </table>
              </DragDropContext>

              {editMode && (
                <Button color="green" icon labelPosition="left" onClick={addSubtask}>
                  <Icon name="plus" />
                  Add Subtask
                </Button>
              )}
            </>
          )}
        </Modal.Content>

        <Modal.Actions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          {editMode && (
            <Button color="blue" onClick={handleSave} loading={loading}>
              Save
            </Button>
          )}
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default TemplateModal;
