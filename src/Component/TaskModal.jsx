import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Form, Icon, Dropdown, Segment, Header, Table, Input } from "semantic-ui-react";
import axiosInstance from "../utilsJS/axiosInstance";
import { ForwardRefEditor } from "@/utilsJS/ForwardRefEditor";

// Helper component for the Subtask Description Editor in the table
const SubtaskDescriptionCell = React.forwardRef(({ markdown, onChange, internalMode }, ref) => (
  <Form.Field style={{ margin: 0 }}>
    {internalMode === "view" ? (
      <div dangerouslySetInnerHTML={{ __html: markdown }} />
    ) : (
      <ForwardRefEditor
        editorRef={ref}
        markdown={markdown}
        onChange={onChange}
        minimal={true}
      />
    )}
  </Form.Field>
));
SubtaskDescriptionCell.displayName = 'SubtaskDescriptionCell';


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
  // Ref for the subtask editor (using a single one as a placeholder, though multiple are rendered)
  const subtaskEditorRefs = useRef([]); 

  // NEW: Assignee dropdown options
  const [assigneeOptions, setAssigneeOptions] = useState([]);

  // New: dirty tracking for changes
  const [isDirty, setIsDirty] = useState(false);

  const loadAssignees = async () => {
    try {
      const usersRes = await axiosInstance.get("/users/all?limit=5000");
      const users = usersRes.data.users || [];

      const userOptions = users.map((u) => ({
        key: `user-${u.id}`,
        text: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
        value: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
        type: "user",
      }));

      const groupsRes = await axiosInstance.get("/groups/");
      const groups = groupsRes.data || [];

      const groupOptions = groups.map((g) => ({
        key: `group-${g.id}`,
        text: g.name,
        value: g.name,
        type: "group",
      }));

      setAssigneeOptions([
        { key: "header-users", text: "Users", value: null, disabled: true },
        ...userOptions,
        { key: "header-groups", text: "Groups", value: null, disabled: true },
        ...groupOptions,
      ]);
    } catch (err) {
      console.error("Failed to load assignees", err);
    }
  };

  const resetModalState = () => {
    setInternalMode(mapMode(mode));
    setName("");
    setDescription("");
    setTemplateDescription("");
    setTemplateId(null);
    setTemplateSubtasks([]);
    setTaskSubtasks([]);
    setIsDirty(false);
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

      // Reset dirty after loading existing task details
      setIsDirty(false);
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

    if (internalMode === "edit" || internalMode.includes("create")) {
      loadAssignees();
    }

    if ((internalMode === "view" || internalMode === "edit") && task?.id) {
      loadTaskDetails(task.id);
    } else {
      setName("");
      setDescription("");
      setTemplateDescription("");
      setTaskSubtasks([]);
      setTemplateSubtasks([]);
      setIsDirty(false);
    }
  }, [open, internalMode, task]);

  const onTemplateChange = async (e, { value }) => {
    setTemplateId(value);
    // mark dirty when template selection changed
    setIsDirty(true);
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

  // Subtask validation (Option A: strict)
  const isSubtaskValid = (st) =>
    !!(st?.action?.toString().trim()) &&
    !!(st?.description?.toString().trim()) &&
    !!(st?.assignee?.toString().trim());

  const allValidSubtasks = () => {
    const list = templateId ? templateSubtasks : taskSubtasks;
    if (!list || list.length === 0) return true;
    return list.every(isSubtaskValid);
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

  // helper to mark dirty
  const markDirty = () => setIsDirty(true);

  // --- START MODIFIED/NEW RENDERING FUNCTIONS ---

  // Function to remove a subtask
  const removeSubtask = (index, listSetter, listState) => {
    const updated = listState.filter((_, i) => i !== index);
    listSetter(updated);
    markDirty();
  };
  
  // New: Renders subtasks in an editable table format
  const renderEditableSubtaskTable = (listState, listSetter) => {
    // Ensure we have enough refs for all subtasks
    subtaskEditorRefs.current = listState.map(
        (element, i) => subtaskEditorRefs.current[i] ?? React.createRef()
    );

    const update = (index, field, value) => {
      const updated = [...listState];
      updated[index] = { ...updated[index], [field]: value };
      listSetter(updated);
      markDirty();
    };

    return (
      <Table celled structured>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell width={3}>Action *</Table.HeaderCell>
            <Table.HeaderCell width={7}>Description *</Table.HeaderCell>
            <Table.HeaderCell width={3}>Assignee *</Table.HeaderCell>
            <Table.HeaderCell width={2}>Depends On</Table.HeaderCell>
            <Table.HeaderCell width={1}>Remove</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {listState.map((st, index) => (
            <Table.Row key={index} warning={!isSubtaskValid(st)}>
              {/* Action */}
              <Table.Cell>
                <Form.Input
                  value={st.action || ""}
                  onChange={(e) => update(index, "action", e.target.value)}
                  placeholder="e.g., Check Config"
                  error={!st.action?.trim()}
                />
              </Table.Cell>

              {/* Description */}
              <Table.Cell>
                <SubtaskDescriptionCell
                  markdown={st.description || ""}
                  onChange={(value) => update(index, "description", value)}
                  internalMode={internalMode}
                  ref={subtaskEditorRefs.current[index]}
                />
              </Table.Cell>

              {/* Assignee */}
              <Table.Cell>
                <Dropdown
                  placeholder="Select Assignee"
                  fluid
                  selection
                  search
                  options={assigneeOptions}
                  value={st.assignee || ""}
                  onChange={(e, { value, options }) => {
                    const opt = options.find((o) => o.value === value);
                    const name = opt?.text || "";
                    update(index, "assignee", name);
                  }}
                  noResultsMessage="No users or groups found"
                  error={!st.assignee?.trim()}
                />
              </Table.Cell>

              {/* Depends On */}
              <Table.Cell>
                <Input
                  fluid
                  value={st.dependsOn || (index === 0 ? "N/A" : "")}
                  disabled={index === 0}
                  onChange={(e) => update(index, "dependsOn", e.target.value)}
                  placeholder={index === 0 ? "N/A" : "Prev ID or Name"}
                />
              </Table.Cell>
              
              {/* Remove Button */}
              <Table.Cell textAlign="center">
                <Button 
                  icon='trash' 
                  color='red' 
                  size='tiny' 
                  onClick={() => removeSubtask(index, listSetter, listState)} 
                  title="Remove Subtask"
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  };
  
  // Existing function for view mode (simplified)
  const renderSubtaskTable = (list) => (
    <Table celled structured>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell width={3}>Action</Table.HeaderCell>
          <Table.HeaderCell width={7}>Description</Table.HeaderCell>
          <Table.HeaderCell width={3}>Assignee</Table.HeaderCell>
          <Table.HeaderCell width={2}>Depends On</Table.HeaderCell>
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
            <Table.Cell>{st.dependsOn || "N/A"}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
  
  // --- END MODIFIED/NEW RENDERING FUNCTIONS ---


  // The original renderEditableSubtask is no longer used, but I'll comment it out
  /*
  const renderEditableSubtask = (st, index, listSetter, listState) => {
     // ... (original implementation)
  };
  */

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
          <Form.Field required>
            <label>Task Name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              readOnly={internalMode === "view"}
            />
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
                loading={loadingTemplates}
              />
            </Form.Field>
          )}

          {!templateId && (
            <Form.Field>
              <label>Description</label>
              {internalMode === "view" ? (
                <Table celled>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <div dangerouslySetInnerHTML={{ __html: description }} />
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table>
              ) : (
                <ForwardRefEditor
                  editorRef={editorRef}
                  markdown={description}
                  onChange={(v) => {
                    setDescription(v);
                    markDirty();
                  }}
                />
              )}
            </Form.Field>
          )}

          {templateId && (
            <Form.Field>
              <Header as="h4" attached="top">
                Template Description (Saved in Task)
              </Header>
              {internalMode === "view" ? (
                <Table celled>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <div dangerouslySetInnerHTML={{ __html: templateDescription }} />
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table>
              ) : (
                <ForwardRefEditor
                  key={`template-editor-${templateId}-${Math.random()}`}
                  editorRef={templateEditorRef}
                  markdown={templateDescription}
                  onChange={(v) => {
                    setTemplateDescription(v);
                    markDirty();
                  }}
                />
              )}
            </Form.Field>
          )}

          {/* ===== Template Subtasks (Table view for all modes) ===== */}
          {templateId && (
            <>
              <Header as="h4" attached="top">
                Template Subtasks
              </Header>

              {templateSubtasks.length > 0 &&
                (internalMode === "view"
                  ? renderSubtaskTable(templateSubtasks)
                  : renderEditableSubtaskTable(templateSubtasks, setTemplateSubtasks))}

              {internalMode !== "view" && (
                <Button
                  icon="plus"
                  content="Add Subtask"
                  color="green"
                  size="small"
                  style={{ marginTop: "10px" }}
                  onClick={() => {
                    setTemplateSubtasks([
                      ...templateSubtasks,
                      { action: "", description: "", assignee: "", dependsOn: "" },
                    ]);
                    markDirty();
                  }}
                />
              )}
            </>
          )}

          {/* ===== Task Subtasks (Table view for all modes) ===== */}
          {!templateId && (
            <>
              <Header as="h4" attached="top">
                Task Subtasks
              </Header>

              {taskSubtasks.length > 0 &&
                (internalMode === "view"
                  ? renderSubtaskTable(taskSubtasks)
                  : renderEditableSubtaskTable(taskSubtasks, setTaskSubtasks))}

              {internalMode !== "view" && (
                <Button
                  icon="plus"
                  content="Add Subtask"
                  color="green"
                  size="small"
                  style={{ marginTop: "10px" }}
                  onClick={() => {
                    setTaskSubtasks([
                      ...taskSubtasks,
                      { action: "", description: "", assignee: "", dependsOn: "" },
                    ]);
                    markDirty();
                  }}
                />
              )}
            </>
          )}
        </Form>
      </Modal.Content>

      <Modal.Actions>
        {/* Single Edit/View toggle button only shown if there is a task ID (i.e., not initial create) */}
        {task?.id && (
          <Button
            color="blue"
            onClick={() => {
              if (internalMode === "view") setInternalMode("edit");
              else setInternalMode("view");
            }}
          >
            <Icon name={internalMode === "view" ? "edit" : "eye"} />
            {internalMode === "view" ? "Edit" : "View"}
          </Button>
        )}
        
         
        {internalMode !== "view" && (
          <Button
            color="green"
            onClick={saveTask}
            loading={saving}
            disabled={!name.trim() || !allValidSubtasks() || !isDirty}
          >
            <Icon name="save" /> Save
          </Button>
        )}

        <Button onClick={handleClose}>
          <Icon name="close" /> Close
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default TaskModal;