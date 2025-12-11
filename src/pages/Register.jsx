import { useState } from "react";
import { useRouter } from "next/router";
import { Form, Button, Segment, Header, Icon, Grid } from "semantic-ui-react";
import axiosInstance from "@/utilsJS/axiosInstance";
import withAuth from "@/utilsJS/withAuth";
import ConfirmModal from "../Component/Confirm";
import Toast from "../Component/Toast";

function Register() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    id: "",
    password: "",
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    dept: "",
  });

  const [loading, setLoading] = useState(false);

  // Modal + Toast states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmHeader, setConfirmHeader] = useState("");
  const [confirmContent, setConfirmContent] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });

  const showToast = (message, type = "success") => {
    setToast({ message, type, visible: true });
  };

  const handleChange = (e, { name, value }) => {
    setFormData({ ...formData, [name]: value });
  };

  const fixEmail = () => {
    const email = formData.email.trim();

    if (!email) {
      showToast("Email cannot be empty", "error");
      return false;
    }

    if (!email.includes("@")) {
      showToast("Email must contain '@'", "error");
      return false;
    }

    if (!email.endsWith("@nichi.com")) {
      showToast("Email must end with @nichi.com", "error");
      return false;
    }

    setFormData((prev) => ({ ...prev, email }));
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setConfirmHeader("Confirm Registration");
    setConfirmContent("Are you sure you want to register this user?");
    setConfirmAction(() => submitForm);
    setConfirmOpen(true);
  };

  const submitForm = async () => {
    setConfirmOpen(false);
    setLoading(true);

    const idPattern = /^\d{8}$/;
    if (!idPattern.test(formData.id)) {
      showToast("UserID must be an 8-digit number", "error");
      setLoading(false);
      return;
    }

    if (!fixEmail()) {
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.post(
        "http://localhost:8000/api/register",
        formData,
        { headers: { "Content-Type": "application/json" } }
      );

      const data = res.data;

      if (res.status === 200) {
        if (data.success) {
          showToast(data.message || "User registered successfully", "success");
          setFormData({
            id: "",
            password: "",
            firstName: "",
            lastName: "",
            displayName: "",
            email: "",
            dept: "",
          });
        } else {
          showToast(data.message || "Failed to register user", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmHeader("Clear Form?");
    setConfirmContent("Are you sure you want to clear the form?");
    setConfirmAction(() => clearForm);
    setConfirmOpen(true);
  };

  const clearForm = () => {
    setFormData({
      id: "",
      password: "",
      firstName: "",
      lastName: "",
      displayName: "",
      email: "",
      dept: "",
    });
    setConfirmOpen(false);
  };

  const goBack = () => {
    router.push("/User");
  };

  return (
    <Grid centered >
      <Grid.Column mobile={16} tablet={14} computer={10}>
        <Segment padded="very" raised>
          <Header as="h2" textAlign="center" style={{ color: "#5f3d97ff" }}>
            <Icon name="user plus" />
            User Register
          </Header>

          <Button
            icon
            labelPosition="left"
            onClick={goBack}
            color="grey"
            basic
            size="small"
            style={{ marginBottom: "1em" }}
          >
            <Icon name="arrow left" />
            Back
          </Button>

          <Form onSubmit={handleSubmit}>
   
  <Form.Group widths="equal">
    <Form.Input
      label="User ID"
      name="id"
      value={formData.id}
      onChange={handleChange}
      required
      placeholder="8-digit User ID"
    />
    <Form.Input
      label="Password"
      type="password"
      name="password"
      value={formData.password}
      onChange={handleChange}
      required
    />
  </Form.Group>

 
  <Form.Group widths="equal">
    <Form.Input
      label="First Name"
      name="firstName"
      value={formData.firstName}
      onChange={handleChange}
      required
    />
    <Form.Input
      label="Last Name"
      name="lastName"
      value={formData.lastName}
      onChange={handleChange}
      required
    />
  </Form.Group>

 
  <Form.Group widths="equal">
    <Form.Input
      label="Display Name"
      name="displayName"
      value={formData.displayName}
      onChange={handleChange}
      required
    />
    <Form.Input
      label="Department"
      name="dept"
      value={formData.dept}
      onChange={handleChange}
      placeholder="Optional"
    />
  </Form.Group>

  
  <Form.Field width={16}>
    <Form.Input
      fluid
      label="Email"
      name="email"
      value={formData.email}
      onChange={handleChange}
      onBlur={fixEmail}
      required
      placeholder="username@nichi.com"
      style={{width:"49%"}}
    />
  </Form.Field>

 
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: "1em",
    }}
  >
    <Button
      type="button"
      onClick={handleCancel}
      color="grey"
      basic
      style={{ width:"fit-content" }}
    >
      Clear
    </Button>

    <Button
      type="submit"
      loading={loading}
      disabled={loading}
      style={{
        backgroundColor: "#5f3d97ff",
        color: "white",
        width: "fit-content",
      }}
    >
      {loading ? "Registering..." : "Register"}
    </Button>
  </div>
</Form>

        </Segment>
      </Grid.Column>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAction}
        header={confirmHeader}
        content={confirmContent}
      />

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </Grid>
  );
}

export default withAuth(Register);
