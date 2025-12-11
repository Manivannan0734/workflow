// Component: TemplateModal.jsx
"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Modal, Button, Icon, Message } from "semantic-ui-react";
import axiosInstance from "@/utilsJS/axiosInstance";
import Toast from "@/Component/Toast";
import ConfirmModal from "@/Component/Confirm";
import LoadingSkeletonRows from "@/Component/Loading";

// Import the new split components
import TemplateDetailsForm from "./TemplateDetailsForm";
import SubtaskTable from "./SubtaskTable";

// --- Allowed file types ---
const ALLOWED_EXTENSIONS = new Set([
  "txt",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "png",
  "jpeg",
  "jpg",
  "pdf",
]);

// --- Utility Functions (Kept outside for pure function benefits) ---
const parseDeps = (depStr) => {
  if (!depStr) return [];
  if (Array.isArray(depStr))
    return depStr.map((d) => (d || "").toString().trim()).filter(Boolean);
  return (depStr || "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const joinDeps = (depsArr) => {
  if (!depsArr || depsArr.length === 0) return "";
  return depsArr
    .map((d) => d.toString().trim())
    .filter(Boolean)
    .join(",");
};

const normalizeAssignee = (assigneeVal) => {
  if (typeof assigneeVal === "number") return `user_${assigneeVal}`;
  if (typeof assigneeVal !== "string") return "";

  // Normalize existing string formats like "user:123" or "group:456"
  if (/^user:?\d+$/i.test(assigneeVal))
    return assigneeVal.replace(/[:]/, "_");
  if (/^group:?\d+$/i.test(assigneeVal))
    return assigneeVal.replace(/[:]/, "_");
  // Assume a number string is a user ID
  if (/^\d+$/.test(assigneeVal)) return `user_${assigneeVal}`;

  return assigneeVal;
};

// --- Main Component ---
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
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const editorRef = useRef(null);

  // file state for upload
  const [file, setFile] = useState(null);
  const [fileNameDisplay, setFileNameDisplay] = useState("");

  const markChanged = useCallback(() => setIsChanged(true), []);

  // --- Data Fetching ---
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/groups/users");
      setUsersList(data || []);
      console.log(data);
      
    } catch (err) {
      console.error("fetchUsers error", err);
      setUsersList([]);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/groups/");
      setGroupsList(data || []);
    } catch (err) {
      console.error("fetchGroups error", err);
      setGroupsList([]);
    }
  }, []);

  // --- File selection handler (wired to TemplateDetailsForm -> ForwardRefEditor or FileUpload) ---
  async function handleFileSelect(e) {
    // support both input event and direct File object (forwarded)
    let selected;
    if (!e) return;
    if (e.target && e.target.files) {
      selected = e.target.files[0];
    } else if (e instanceof File) {
      selected = e;
    } else {
      // unknown shape
      return;
    }

    if (!selected) return;

    const ext = (selected.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      setShowToast({
        message:
          "Invalid file type. Allowed: .txt, .ppt, .pptx, .xls, .xlsx, .csv, .png, .jpeg, .jpg, .pdf",
        type: "error",
      });
      return;
    }

    // store file in state and mark changed (enables Save)
    setFile(selected);
    setFileNameDisplay(selected.name);
    markChanged();
  }

  // --- Save file to user's chosen drive/folder using File System Access API ---
  const saveFileToDrive = useCallback(async () => {
    if (!file) return true; // nothing to save, continue

    try {
      // Ask user to pick a directory
      const dirHandle = await window.showDirectoryPicker();

      // Create (or get) Attachment folder inside chosen directory
      const attachmentHandle = await dirHandle.getDirectoryHandle("Attachment", {
        create: true,
      });

      // Create or overwrite the file
      const fileHandle = await attachmentHandle.getFileHandle(file.name, {
        create: true,
      });

      const writable = await fileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      setShowToast({
        message: `File saved to ${"Attachment/"}${file.name}`,
        type: "success",
      });

      return true;
    } catch (err) {
      // User cancelled folder pick (AbortError) or some other error
      console.error("saveFileToDrive error:", err);
      // If user aborts selection, `err.name === 'AbortError'` in many browsers
      if (err?.name === "AbortError") {
        setShowToast({
          message: "File save cancelled by user.",
          type: "error",
        });
      } else {
        setShowToast({
          message: "Failed to save file to drive.",
          type: "error",
        });
      }
      return false;
    }
  }, [file]);

  // --- Effect: reset when modal closes/open changes ---
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setFields({ name: "", description: "", label: "", createdBy: "" });
      setSubtasks([]);
      setError("");
      setIsChanged(false);
      setEditMode(false);
      setExpandedDescriptions({});
      setFile(null);
      setFileNameDisplay("");
      return;
    }

    const initialize = async () => {
      try {
        setLoading(true);
        const loggedUser = localStorage.getItem("displayName") || "";

        if (isEdit && selectedTemplate?.id) {
          const { data } = await axiosInstance.get(
            `/templates/${selectedTemplate.id}`
          );

          setFields({
            name: data.name || "",
            description: data.description || "",
            label: data.label || "",
            createdBy: data.createdBy || loggedUser,
          });

          const normalizedSubtasks = (data.subtasks || []).map((st, idx) => ({
            __id: `subtask-${selectedTemplate.id || "t"}-${idx}-${
              Date.now() + idx
            }`,
            action: st.action || "",
            dependsOn: st.dependsOn || "",
            description: st.description || "",
            assignee: normalizeAssignee(st.assignee),
          }));

          setSubtasks(normalizedSubtasks);
          setIsChanged(false);
          setEditMode(false); // Existing templates start in View Mode
          // prefill file info if template has attachment meta (optional)
          // setFile(null); setFileNameDisplay(data.attachmentName || "");
        } else {
          setFields({
            name: "",
            description: "",
            createdBy: loggedUser,
            label: "",
          });
          setSubtasks([]);
          setEditMode(true); // New templates start immediately in Edit Mode
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
  }, [open, selectedTemplate, isEdit, fetchUsers, fetchGroups]);

  // --- Handlers ---
  const handleChange = useCallback(
    (e, { name, value }) => {
      setFields((prev) => ({ ...prev, [name]: value }));
      markChanged();
    },
    [markChanged]
  );

  const validateSubtaskDependencies = useCallback(
    (index, field, value) => {
      let valueArray = [];
      let newValStr = value;

      if (field === "dependsOn") {
        valueArray = Array.isArray(value) ? value : parseDeps(value);
        newValStr = joinDeps(valueArray);

        if (index === 0 && newValStr) {
          setShowToast({
            message: "First task cannot have a Depends On. It must be N/A.",
            type: "error",
          });
          return false;
        }

        const selfAction = (subtasks[index]?.action || "").toString().trim();
        if (
          selfAction &&
          valueArray.some((v) => v.toString().trim() === selfAction)
        ) {
          setShowToast({
            message: `Task ${index + 1}: "Depends On" cannot match its own Action.`,
            type: "error",
          });
          return false;
        }

        if (valueArray.length > 0) {
          const earlierActions = subtasks
            .slice(0, index)
            .map((s) => (s.action || "").toString())
            .filter(Boolean);
          const invalid = valueArray.find(
            (v) => !earlierActions.includes((v || "").toString())
          );
          if (invalid) {
            setShowToast({
              message: `Task ${index + 1}: "Depends On" must reference action(s) from previous tasks only.`,
              type: "error",
            });
            return false;
          }
        }
      }

      return newValStr; // Return the validated/normalized value for update
    },
    [subtasks]
  );

  const handleSubtaskChange = useCallback(
    (index, field, value) => {
      const validatedValue = validateSubtaskDependencies(index, field, value);

      if (validatedValue === false) return; // Validation failed

      setSubtasks((prev) =>
        prev.map((st, i) =>
          i === index
            ? { ...st, [field]: field === "dependsOn" ? validatedValue : value }
            : st
        )
      );
      markChanged();
    },
    [markChanged, validateSubtaskDependencies]
  );

  const addSubtask = useCallback(() => {
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
  }, [markChanged]);

  const removeSubtask = useCallback((index) => {
    setConfirmPayload({
      index,
      message: "Are you sure you want to remove this subtask?",
    });
    setConfirmOpen(true);
  }, []);

  const confirmRemove = useCallback(() => {
    if (confirmPayload?.index !== undefined) {
      const delIndex = confirmPayload.index;
      setSubtasks((prev) => {
        const toDelete = prev[delIndex];
        const deletedAction = (toDelete?.action || "").toString().trim();
        const filtered = prev.filter((_, i) => i !== delIndex);

        return filtered.map((st, idx) => {
          if (idx === 0) return { ...st, dependsOn: "" }; // First task cannot have dependency

          const deps = parseDeps(st.dependsOn);
          // Only filter out the deleted action if it existed
          const newDeps = deletedAction ? deps.filter((d) => d !== deletedAction) : deps;

          return { ...st, dependsOn: joinDeps(newDeps) };
        });
      });

      setConfirmOpen(false);
      setConfirmPayload(null);
      markChanged();
    }
  }, [confirmPayload, markChanged]);

  const toggleDescriptionExpansion = useCallback((id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const onDragEnd = useCallback(
    (result) => {
      if (!result.destination || !editMode) return;

      const { source, destination } = result;
      if (source.index === destination.index) return;

      const newSubtasks = Array.from(subtasks);
      const [removed] = newSubtasks.splice(source.index, 1);
      newSubtasks.splice(destination.index, 0, removed);

      const invalidReason = (() => {
        if (newSubtasks.length > 0) {
          const firstDependsArr = parseDeps(newSubtasks[0].dependsOn);
          if (firstDependsArr.length > 0)
            return "First task cannot have a Depends On. Move not allowed.";
        }
        for (let i = 0; i < newSubtasks.length; i++) {
          const { action = "", dependsOn = "" } = newSubtasks[i];
          const act = (action || "").toString().trim();
          const depArr = parseDeps(dependsOn);

          if (depArr.length > 0) {
            if (depArr.includes(act) && act)
              return `Task ${i + 1}: "Depends On" cannot match its own Action. Move not allowed.`;
            const earlierActions = newSubtasks
              .slice(0, i)
              .map((s) => (s.action || "").toString().trim())
              .filter(Boolean);
            for (const dep of depArr)
              if (!earlierActions.includes(dep))
                return `Task ${i + 1}: "Depends On" must reference an action that appears earlier. Move not allowed.`;
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
    },
    [subtasks, editMode, markChanged]
  );

  // --- Validation & Save ---
  const validateBeforeSave = useCallback(() => {
    if (!fields.name.trim() || !fields.description.trim() || !fields.label.trim()) {
      setShowToast({ message: "Please fill all required template fields", type: "error" });
      return false;
    }

    const actionDependsMap = new Set();

    for (let i = 0; i < subtasks.length; i++) {
      const { action = "", dependsOn = "", assignee = "", description = "" } = subtasks[i];

      // Basic fields validation
      if (!action.trim()) {
        setShowToast({ message: `Subtask ${i + 1}: Action is required.`, type: "error" });
        return false;
      }
      if (!description.trim()) {
        setShowToast({ message: `Subtask ${i + 1}: Description is required.`, type: "error" });
        return false;
      }
      if (!assignee.trim()) {
        setShowToast({ message: `Subtask ${i + 1}: Please select an Assignee.`, type: "error" });
        return false;
      }

      const act = action.trim();
      const depsArr = parseDeps(dependsOn);

      // Dependency logic validation (re-validation after any change/drag/etc)
      if (i === 0 && depsArr.length > 0) {
        setShowToast({
          message: `Subtask 1: First task cannot have a Depends On. It must be N/A.`,
          type: "error",
        });
        return false;
      }

      if (depsArr.length > 0) {
        if (depsArr.includes(act)) {
          setShowToast({
            message: `Subtask ${i + 1}: "Depends On" cannot match its own Action.`,
            type: "error",
          });
          return false;
        }

        const earlierActions = subtasks
          .slice(0, i)
          .map((s) => (s.action || "").toString().trim())
          .filter(Boolean);

        for (const dep of depsArr) {
          if (!earlierActions.includes(dep)) {
            setShowToast({
              message: `Subtask ${i + 1}: "Depends On" must reference an action from a previous task.`,
              type: "error",
            });
            return false;
          }
        }
      }

      // Check for duplicate Action/DependsOn combination
      const depKey = depsArr.length ? joinDeps(depsArr.sort()) : "N/A";
      const uniqueKey = `${act}|${depKey}`;
      if (actionDependsMap.has(uniqueKey)) {
        setShowToast({
          message: `Subtask ${i + 1}: Duplicate Action '${act}' with dependency '${depKey}'.`,
          type: "error",
        });
        return false;
      }
      actionDependsMap.add(uniqueKey);
    }

    return true;
  }, [fields, subtasks]);

  const handleSave = useCallback(async () => {
    // Validate first (this shows toast if invalid)
    if (!validateBeforeSave()) return;

    setLoading(true);
    setError("");

    try {
      // If a file was selected, save it to the user-picked folder first
      if (file) {
        const ok = await saveFileToDrive();
        if (!ok) {
          // file save failed or user cancelled - abort the whole save
          setLoading(false);
          return;
        }
      }

      // Clean up the subtasks array before sending to API
      const payload = {
        ...fields,
        subtasks: subtasks.map(({ __id, ...rest }) => rest),
        // Optionally include metadata about attachment so backend can store a reference:
        attachmentName: file ? file.name : undefined,
      };

      if (isEdit) {
        await axiosInstance.put(`/templates/${selectedTemplate.id}`, payload);
      } else {
        await axiosInstance.post("/templates/", payload);
      }

      setShowToast({
        message: isEdit ? "Template updated successfully!" : "Template added successfully!",
        type: "success",
      });

      setIsChanged(false);
      onSuccess?.();
      // smoother closing after successful save
      requestAnimationFrame(() => onClose());
    } catch (err) {
      console.error(err);
      setShowToast({ message: "Failed to save template", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [
    validateBeforeSave,
    fields,
    subtasks,
    isEdit,
    selectedTemplate,
    onSuccess,
    onClose,
    file,
    saveFileToDrive,
  ]);

  return (
    <>
      {confirmOpen && confirmPayload && (
        <ConfirmModal
          open={confirmOpen}
          message={confirmPayload.message}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmPayload(null);
          }}
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
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {isEdit && (
            <Button
              icon
              labelPosition="left"
              color={editMode ? "green" : "blue"}
              onClick={() => setEditMode(!editMode)}
              style={{
                marginTop: "1em",
                position: "absolute",
                marginRight: "1em",
                zIndex: 10,
              }}
            >
              <Icon name={editMode ? "edit" : "eye"} />
              {editMode ? "Edit Mode" : "View Mode"}
            </Button>
          )}
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

              <TemplateDetailsForm
                fields={fields}
                editMode={editMode}
                handleChange={handleChange}
                editorRef={editorRef}
                // pass file-change handler so the editor/file upload UI can call it
                handleFileChange={handleFileSelect}
              />

              {/* show selected filename (if any) */}
              {fileNameDisplay && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
                  Selected file: <strong>{fileNameDisplay}</strong>
                </div>
              )}

              <SubtaskTable
                subtasks={subtasks}
                editMode={editMode}
                usersList={usersList}
                groupsList={groupsList}
                expandedDescriptions={expandedDescriptions}
                onSubtaskChange={handleSubtaskChange}
                onDragEnd={onDragEnd}
                onRemoveSubtask={removeSubtask}
                onToggleDescriptionExpansion={toggleDescriptionExpansion}
                onAddSubtask={addSubtask}
                parseDeps={parseDeps}
              />
            </>
          )}
        </Modal.Content>

        <Modal.Actions>
          <Button onClick={onClose} disabled={loading || (editMode && isChanged)}>
            {editMode && isChanged ? "Discard & Close" : "Cancel"}
          </Button>
          {editMode && (
            <Button
              color="blue"
              onClick={handleSave}
              loading={loading}
              disabled={loading || !isChanged}
            >
              Save
            </Button>
          )}
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default TemplateModal;
