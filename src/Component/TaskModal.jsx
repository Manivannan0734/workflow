import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Form, Icon, Dropdown, Segment, Header, Table, Input } from "semantic-ui-react";
import axiosInstance from "../utilsJS/axiosInstance";
import { ForwardRefEditor } from "@/utilsJS/ForwardRefEditor";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";

const SubtaskDescriptionCell = React.forwardRef(({ markdown, onChange, internalMode }, ref) => (
  <Form.Field style={{ margin: 0 }}>
    {internalMode === "view" ? (
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, [rehypeSanitize, { ...defaultSchema }]]}
      >
        {markdown}
      </ReactMarkdown>
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
  const subtaskEditorRefs = useRef([]); 

  const [assigneeOptions, setAssigneeOptions] = useState([]);
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
    if (internalMode === "edit") return; // DISABLE changing template in edit mode
    setTemplateId(value);
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

  const markDirty = () => setIsDirty(true);

  const removeSubtask = (index, listSetter, listState) => {
    const updated = listState.filter((_, i) => i !== index);
    listSetter(updated);
    markDirty();
  };

  const renderEditableSubtaskTable = (listState, listSetter) => {
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
            <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }}  width={3}>Action *</Table.HeaderCell>
            <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={7}>Description *</Table.HeaderCell>
            <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={3}>Assignee *</Table.HeaderCell>
            <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2}>Depends On</Table.HeaderCell>
            <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={1}>Remove</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {listState.map((st, index) => (
            <Table.Row key={index} warning={!isSubtaskValid(st)}>
              <Table.Cell>
                <Form.Input
                  value={st.action || ""}
                  onChange={(e) => update(index, "action", e.target.value)}
                  placeholder="e.g., Check Config"
                  error={!st.action?.trim()}
                />
              </Table.Cell>

              <Table.Cell>
                <SubtaskDescriptionCell
                  markdown={st.description || ""}
                  onChange={(value) => update(index, "description", value)}
                  internalMode={internalMode}
                  ref={subtaskEditorRefs.current[index]}
                />
              </Table.Cell>

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

              <Table.Cell>
                <Input
                  fluid
                  value={st.dependsOn || (index === 0 ? "N/A" : "")}
                  disabled={index === 0}
                  onChange={(e) => update(index, "dependsOn", e.target.value)}
                  placeholder={index === 0 ? "N/A" : "Prev ID or Name"}
                />
              </Table.Cell>
              
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

  const renderSubtaskTable = (list) => (
    <Table celled structured>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={3}>Action</Table.HeaderCell>
          <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={7}>Description</Table.HeaderCell>
          <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={3}>Assignee</Table.HeaderCell>
          <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2}>Depends On</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {list.map((st, idx) => (
          <Table.Row key={idx}>
            <Table.Cell>{st.action}</Table.Cell>
            <Table.Cell>
              <ReactMarkdown
                rehypePlugins={[rehypeRaw, [rehypeSanitize, { ...defaultSchema }]]}
              >
                {st.description}
              </ReactMarkdown>
            </Table.Cell>
            <Table.Cell>{st.assignee}</Table.Cell>
            <Table.Cell>{st.dependsOn || "N/A"}</Table.Cell>
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
          <Form.Field required>
            <h3>Task Name</h3>
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
              <h3>Select Template</h3>
              <Dropdown
                selection
                fluid
           
                options={templates}
                value={templateId ?? ""}
                onChange={onTemplateChange}
                disabled={internalMode === "view" || internalMode === "edit"} 
                loading={loadingTemplates}
              />
            </Form.Field>
          )}

          {!templateId && (
            <Form.Field>
              <h3>Description</h3>
              {internalMode === "view" ? (
                <Table celled>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw, [rehypeSanitize, { ...defaultSchema }]]}
                        >
                          {description}
                        </ReactMarkdown>
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
              <h3>
                Description
              </h3>
              {internalMode === "view" ? (
                <Table celled>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw, [rehypeSanitize, { ...defaultSchema }]]}
                        >
                          {templateDescription}
                        </ReactMarkdown>
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table>
              ) : (
                <ForwardRefEditor
                  {...(internalMode === "create_template"
                    ? { key: `template-editor-${templateDescription}` }
                    : {})}
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

          {templateId && (
            <>
              <h3>
                Subtasks
              </h3>

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

          {!templateId && (
            <>
              <h3>
                Task Subtasks
              </h3>

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
