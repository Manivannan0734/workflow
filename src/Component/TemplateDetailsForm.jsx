// Component: TemplateDetailsForm.jsx
import React from "react";
import { Form, Dropdown } from "semantic-ui-react";
import { ForwardRefEditor } from "../utilsJS/ForwardRefEditor";
import FileUpload from "./FileUpload";

const labelOptions = [
  {
    key: "normal",
    text: "Normal",
    value: "Normal",
    label: { color: "blue", empty: true, circular: true },
  },
  {
    key: "enquiry",
    text: "Enquiry",
    value: "Enquiry",
    label: { color: "yellow", empty: true, circular: true },
  },
  {
    key: "urgent",
    text: "Urgent",
    value: "Urgent",
    label: { color: "red", empty: true, circular: true },
  },
];

const TemplateDetailsForm = React.memo(
  ({ fields, editMode, handleChange, editorRef, handleFileChange }) => (
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
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "6px",
            padding: "6px",
            minHeight: "200px",
          }}
        >
          <ForwardRefEditor
            handleFileChange={handleFileChange}
            showFileUpload={FileUpload}
            editorRef={editorRef}
            markdown={fields.description}
            onChange={(value) => {
              if (!editMode) return;
              handleChange(null, { name: "description", value });
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
          options={labelOptions}
          placeholder="Select Label"
          required
        />
      </Form.Group>
    </Form>
  )
);

TemplateDetailsForm.displayName = "TemplateDetailsForm";
export default TemplateDetailsForm;