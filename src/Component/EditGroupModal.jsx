import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Icon } from "semantic-ui-react";
import ReactDOM from "react-dom";
import styles from "../styles/Editor.module.css";

export default function EditGroupModal({
  group,
  allGroups,
  allUsers,
  groupMembersMap,
  open,
  onClose,
  onSave,
  setSelectedGroup,
}) {
  const [members, setMembers] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // ✅ Track changes
  const dropdownRef = useRef(null);

  // 🔹 When modal opens, set default group
  useEffect(() => {
    if (open) {
      const defaultGroup = group || allGroups[0];
      if (defaultGroup) setSelectedGroupId(defaultGroup.id);
      setHasChanges(false); // reset
    }
  }, [open, group, allGroups]);

  // 🔹 Load members for selected group
  useEffect(() => {
    if (selectedGroupId) {
      const grp = allGroups.find((g) => g.id === selectedGroupId);
      if (grp) {
        setSelectedGroup(grp);
        setMembers(groupMembersMap[selectedGroupId] || []);
        setHasChanges(false); // reset when switching groups
      }
    }
  }, [selectedGroupId, allGroups, groupMembersMap, setSelectedGroup]);

  // 🔹 Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 Detect if there are any changes
  useEffect(() => {
    if (!selectedGroupId) return;
    const original = groupMembersMap[selectedGroupId] || [];
    const changed =
      original.length !== members.length ||
      original.some((id) => !members.includes(id));
    setHasChanges(changed);
  }, [members, selectedGroupId, groupMembersMap]);

  // 🔹 Toggle member selection
  const toggleMember = (userId) => {
    if (members.includes(userId)) {
      setMembers(members.filter((id) => id !== userId));
    } else {
      setMembers([...members, userId]);
    }
  };

  // 🔹 Save handler
  const handleSave = () => {
    if (selectedGroupId && hasChanges) {
      onSave(selectedGroupId, members);
      onClose();
    }
  };

  if (!allGroups || allGroups.length === 0) return null;

  return ReactDOM.createPortal(
    <Modal size="tiny" open={open} onClose={onClose} dimmer="inverted" closeIcon={<Icon name="close" color="red" />}>
      <Modal.Header>Edit Group Members</Modal.Header>

      <Modal.Content>
        {/* 🔹 Group Selector */}
        <div className={styles.selectWrapper}>
          <label className={styles.selectLabel}>
            Select Group:
            <select
              value={selectedGroupId || ""}
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              className={styles.selectBox}
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 🔹 Member Selector */}
        <div className={styles.dropdownWrapper} ref={dropdownRef}>
          <div
            className={styles.dropdownHeader}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {members.length > 0
              ? `Members Present in this group (${members.length})`
              : "Select Members"}
            <span className={styles.arrow}>{dropdownOpen ? "▲" : "▼"}</span>
          </div>

          {dropdownOpen && (
            <div className={styles.dropdownList}>
              {allUsers.map((user) => (
                <label key={user.id} className={styles.dropdownItem}>
                  <input
                    type="checkbox"
                    checked={members.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                  />
                  {user.firstName} {user.lastName} ({user.email || "No Email"})
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal.Content>

      {/* 🔹 Actions */}
      <Modal.Actions>
        <Button negative onClick={onClose}>
          Back
        </Button>
        <Button
          positive
          onClick={handleSave}
          disabled={!hasChanges}  
        >
          Save
        </Button>
      </Modal.Actions>
    </Modal>,
    document.body
  );
}
