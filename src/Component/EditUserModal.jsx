"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Icon,
  Input,
  List,
  Segment,
} from "semantic-ui-react";
 
import axiosInstance from "@/utilsJS/axiosInstance";
import Toast from "@/Component/Toast";

export default function EditUserModal({
  allUsers,
  userFieldsMap,
  setEditingFields,
  open,
  onClose,
  onSave,
  setSelectedUser,
}) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [fields, setFields] = useState({});
  const [originalFields, setOriginalFields] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // --- Default user when modal opens ---
  useEffect(() => {
    if (open && allUsers && allUsers.length > 0) {
      const defaultUser = allUsers[0];
      setSelectedUserId(defaultUser.id);
    }
  }, [open, allUsers]);

  // --- Update form fields when user changes ---
  useEffect(() => {
    if (selectedUserId != null) {
      const user =
        allUsers.find((u) => u.id === selectedUserId) ||
        searchResults.find((u) => u.id === selectedUserId);
      if (user) {
        if (typeof setSelectedUser === "function") setSelectedUser(user);
        const userData = userFieldsMap[user.id] || {};
        setFields(userData);
        setOriginalFields(userData);
        setIsModified(false);
      }
    }
  }, [selectedUserId, allUsers, searchResults, userFieldsMap, setSelectedUser]);

  // --- Handle form field change ---
  const handleChange = (field, value) => {
    const updated = { ...fields, [field]: value };
    setFields(updated);
    setIsModified(
      Object.keys(updated).some((k) => updated[k] !== originalFields[k])
    );
  };

  // --- Manual Search (on button click) ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setToastMessage({ text: "Please enter a search term.", type: "error" });
      return;
    }
    try {
      setIsSearching(true);
      const res = await axiosInstance.get(`/users/search`, {
        params: { q: searchQuery },
      });
      const users = res.data.users || [];
      setSearchResults(users);
      if (users.length === 0) {
        setToastMessage({
          text: `No user found for "${searchQuery}"`,
          type: "error",
        });
      }

      // Update local editing fields map
      if (typeof setEditingFields === "function") {
        const updatedEditingFields = { ...userFieldsMap };
        users.forEach((user) => {
          updatedEditingFields[user.id] = {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            displayName: user.displayName || "",
            email: user.email || "",
            dept: user.dept || "",
            updateSource: user.updateSource || "",
          };
        });
        setEditingFields(updatedEditingFields);
      }
    } catch (err) {
      console.error(err);
      setToastMessage({
        text: "Search failed. Please try again.",
        type: "error",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // --- Select user  
  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);

    const userData = userFieldsMap[user.id] || {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      dept: user.dept || "",
      updateSource: user.updateSource || "",
    };

    setFields(userData);
    setOriginalFields(userData);
    setIsModified(false);

    setSearchQuery(user.displayName || `${user.firstName} ${user.lastName}`);
    setSearchResults([]);

    if (typeof setSelectedUser === "function") setSelectedUser(user);
  };

  // --- Save user ---
  const handleSave = () => {
    if (selectedUserId == null) return;

    const requiredFields = [
      "firstName",
      "lastName",
      "displayName",
      "email",
      "dept",
      "updateSource",
    ];
    const emptyFields = requiredFields.filter(
      (key) => !fields[key] || fields[key].trim() === ""
    );

    if (emptyFields.length > 0) {
      const missing = emptyFields.join(", ");
      setToastMessage({
        text: `Please fill all required fields: ${missing}`,
        type: "error",
      });
      return;
    }

    if (!fields.email.toLowerCase().endsWith("@nichi.com")) {
      setToastMessage({
        text: "Email must end with @nichi.com",
        type: "error",
      });
      return;
    }

    if (!isModified) {
      setToastMessage({ text: "No changes to save.", type: "error" });
      return;
    }

    try {
      onSave(selectedUserId, fields);
      setIsModified(false);
      onClose();
      setToastMessage({
        text: "User details saved successfully.",
        type: "success",
      });
    } catch (err) {
      console.error("Save failed", err);
      setToastMessage({
        text: "Failed to save user details.",
        type: "error",
      });
    }
  };

  return (
    <>
      <Modal
        size="small"
        open={open}
        onClose={onClose}
        dimmer="inverted"
        closeIcon={<Icon name="close" color="red" />}
      >
        <Modal.Header>Edit User Details</Modal.Header>
        <Modal.Content scrolling>
           
          <Form>
            <Form.Group widths="equal">
              <Form.Field style={{ position: "relative" }}>
                <p style={{ fontWeight: "bold" }}>Search User</p>
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  loading={isSearching}
                  icon="search"
                  autoComplete="off"
                  action={
                    <Button
                      color="blue"
                      onClick={handleSearch}
                      loading={isSearching}
                      disabled={isSearching}
                    />
                  }
                />

           
                {searchResults.length > 0 && (
                  <Segment
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      width: "100%",
                      zIndex: 999,
                      maxHeight: "200px",
                      overflowY: "auto",
                      background: "white",
                      border: "1px solid #ccc",
                    }}
                  >
                    <List selection divided>
                      {searchResults.map((user) => (
                        <List.Item
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                        >
                          <List.Content>
                            <List.Header>
                              {user.displayName ||
                                `${user.firstName} ${user.lastName}`}
                            </List.Header>
                            <List.Description>{user.email}</List.Description>
                          </List.Content>
                        </List.Item>
                      ))}
                    </List>
                  </Segment>
                )}
              </Form.Field>
            </Form.Group>
          </Form>

       
          {selectedUserId && (
            <Form>
              <Form.Group widths="equal">
                <Form.Input
                  label="First Name"
                  value={fields.firstName || ""}
                  onChange={(e) =>
                    handleChange("firstName", e.target.value)
                  }
                />
                <Form.Input
                  label="Last Name"
                  value={fields.lastName || ""}
                  onChange={(e) =>
                    handleChange("lastName", e.target.value)
                  }
                />
                <Form.Input
                  label="Display Name"
                  value={fields.displayName || ""}
                  onChange={(e) =>
                    handleChange("displayName", e.target.value)
                  }
                />
              </Form.Group>
              <Form.Group widths="equal">
                <Form.Input
                  label="Email"
                  value={fields.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                <Form.Input
                  label="Department"
                  value={fields.dept || ""}
                  onChange={(e) => handleChange("dept", e.target.value)}
                />
                <Form.Input
                  label="Update Source"
                  value={fields.updateSource || ""}
                  onChange={(e) =>
                    handleChange("updateSource", e.target.value)
                  }
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Content>

        <Modal.Actions>
          <Button negative onClick={onClose}>
            Back
          </Button>
          <Button
            positive
            onClick={handleSave}
            disabled={!isModified}
            icon
            labelPosition="right"
          >
            Save
            <Icon name="check" />
          </Button>
        </Modal.Actions>
      </Modal>

     
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  )
}
