// Component: SubtaskTable.jsx
import React, { useCallback } from "react";
import { Table, Form, Dropdown, Button, Icon } from "semantic-ui-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ForwardRefEditor } from "../utilsJS/ForwardRefEditor";

// Utility to find user/group name for display
const getAssigneeText = (value, usersList, groupsList) => {
  if (!value) return "N/A";
  const [type, id] = value.split("_");
  const parsedId = parseInt(id, 10);

  if (type === "user") {
    const user = usersList.find((u) => u.id === parsedId);
    return user?.name || user?.displayName || user?.email || `User ${id}`;
  }
  if (type === "group") {
    const group = groupsList.find((g) => g.id === parsedId);
    return group?.name || `Group ${id}`;
  }
  return value;
};

const SubtaskTable = React.memo(
  ({
    subtasks,
    editMode,
    usersList,
    groupsList,
    expandedDescriptions,
    onSubtaskChange,
    onDragEnd,
    onRemoveSubtask,
    onToggleDescriptionExpansion,
    onAddSubtask,
    parseDeps,
  }) => {
    // Memoize options for the Assignee Dropdown
    const assigneeOptions = React.useMemo(() => {
      return [
        { key: "header_users", text: "Users", value: "", disabled: true },
        ...usersList.map((u) => ({
          key: `user_${u.id}`,
          value: `user_${u.id}`,
          text: `${u.name || u.displayName || u.email || "User " + u.id}`,
        })),
        { key: "header_groups", text: "Groups", value: "", disabled: true },
        ...groupsList.map((g) => ({
          key: `group_${g.id}`,
          value: `group_${g.id}`,
          text: `${g.name || "Group " + g.id}`,
        })),
      ];
    }, [usersList, groupsList]);

    const renderAssigneeControl = useCallback(
  (st, index) => (
    <Dropdown
      placeholder="Select Assignee"
      fluid
      selection
      search
      options={assigneeOptions}
      value={st.assignee || ""}
      onChange={(e, { value, options }) => {
        const opt = options.find(o => o.value === value);
        const name = opt?.text || "";
        onSubtaskChange(index, "assignee", name);   // <-- save name only
      }}
      noResultsMessage="No users or groups found"
      disabled={!editMode}
    />
  ),
  [assigneeOptions, onSubtaskChange, editMode]
);

    return (
      <>
        <h4 style={{ marginTop: "1em" }}>Subtasks (Drag to Reorder)</h4>
        <div style={{ overflowX: "auto" }}>
          <DragDropContext onDragEnd={editMode ? onDragEnd : () => {}}>
            <Table
              className="ui celled compact table"
              style={{ minWidth: "100%" }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  backgroundColor: "white",
                }}
              >
                <tr>
                  <Table.HeaderCell width={1} textAlign="center">
                    Order
                  </Table.HeaderCell>
                  <Table.HeaderCell width={2}>Action</Table.HeaderCell>
                  <Table.HeaderCell width={2}>Depends On</Table.HeaderCell>
                  <Table.HeaderCell width={2}>Assignee</Table.HeaderCell>
                  <Table.HeaderCell width={1} textAlign="center">
                    Description
                  </Table.HeaderCell>
                  {editMode && (
                    <Table.HeaderCell width={1}>Remove</Table.HeaderCell>
                  )}
                </tr>
              </thead>
              <Droppable droppableId="subtasks">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {subtasks.map((st, index) => (
                      <React.Fragment key={st.__id}>
                        <Draggable
                          draggableId={st.__id}
                          index={index}
                          isDragDisabled={!editMode}
                        >
                          {(provided) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={provided.draggableProps.style}
                            >
                              <td
                                {...provided.dragHandleProps}
                                style={{ textAlign: "center", cursor: editMode ? "grab" : "default" }}
                              >
                                {index + 1}
                              </td>
                              <td>
                                <Form.Input
                                  value={st.action}
                                  onChange={(e, { value }) =>
                                    onSubtaskChange(index, "action", value)
                                  }
                                  disabled={!editMode}
                                  fluid
                                />
                              </td>
                              <td>
                                <Dropdown
                                  placeholder={
                                    index === 0
                                      ? "N/A"
                                      : "Select previous actions"
                                  }
                                  fluid
                                  multiple
                                  search
                                  selection
                                  value={parseDeps(st.dependsOn)}
                                  options={
                                    index === 0
                                      ? []
                                      : subtasks
                                          .slice(0, index)
                                          .map((s, i) => ({
                                            key: `action-${i}`,
                                            value: s.action || "",
                                            text: s.action || `Action ${i + 1}`,
                                          }))
                                  }
                                  onChange={(e, { value }) =>
                                    onSubtaskChange(index, "dependsOn", value)
                                  }
                                  noResultsMessage="No previous actions available"
                                  disabled={!editMode || index === 0}
                                />
                              </td>
                              <td>
                                {editMode ? (
                                  renderAssigneeControl(st, index)
                                ) : (
                                  getAssigneeText(
                                    st.assignee,
                                    usersList,
                                    groupsList
                                  )
                                )}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <Button
                                  icon
                                  basic
                                  compact
                                  onClick={() =>
                                    onToggleDescriptionExpansion(st.__id)
                                  }
                                >
                                  <Icon
                                    name={
                                      expandedDescriptions[st.__id]
                                        ? "angle up"
                                        : "ellipsis horizontal"
                                    }
                                  />
                                </Button>
                              </td>
                              {editMode && (
                                <td>
                                  <Button
                                    icon
                                    color="red"
                                    onClick={() => onRemoveSubtask(index)}
                                  >
                                    <Icon name="trash" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          )}
                        </Draggable>
                        {expandedDescriptions[st.__id] && (
                          <tr>
                            <td colSpan={editMode ? 6 : 5}>
                              <div style={{ padding: "10px" }}>
                                <strong>Description:</strong>
                                <div
                                  style={{ marginTop: "8px", minHeight: "100px" }}
                                >
                                  <ForwardRefEditor
                                    markdown={st.description}
                                    onChange={(val) =>
                                      onSubtaskChange(
                                        index,
                                        "description",
                                        val
                                      )
                                    }
                                    readOnly={!editMode}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </Table>
          </DragDropContext>
        </div>
        {editMode && (
          <Button
            color="green"
            icon
            labelPosition="left"
            onClick={onAddSubtask}
            style={{ marginTop: "1em" }}
          >
            <Icon name="plus" />
            Add Subtask
          </Button>
        )}
      </>
    );
  }
);

SubtaskTable.displayName = "SubtaskTable";
export default SubtaskTable;