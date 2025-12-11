"use client";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";

import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Icon,
  Container,
  Header,
  Message,
  Label,
} from "semantic-ui-react";
import axiosInstance from "@/utilsJS/axiosInstance";
import TemplateModal from "../Component/TemplateModal";
import ConfirmModal from "@/Component/Confirm";
import Toast from "@/Component/Toast";
import { useRouter } from "next/router";
import LoadingSkeletonRows from "@/Component/Loading";

 
const underlineSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u"],
};
 

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const router = useRouter();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/templates/");
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/templates/${deleteId}`);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      setToast({ message: "Template deleted successfully!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to delete template", type: "error" });
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleEditClick = (template) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedTemplate(null);
    setModalOpen(true);
  };

  const getColorForLabel = (label) => {
    switch (label) {
      case "Urgent":
        return "red";
      case "Enquiry":
        return "yellow";
      case "Normal":
        return "blue";
      default:
        return "grey";
    }
  };

  const handleBack = () => {
    router.push("/Landing");
  };

  return (
    <Container style={{ marginTop: "2em" }}>
      <Button
        color="green"
        onClick={handleBack}
        icon
        labelPosition="left"
        style={{ backgroundColor: "#5f3d97ff" }}
      >
        <Icon name="arrow left" />
        Back
      </Button>
      <Button
          style={{ backgroundColor: "#5F3D97", color: "#fff" }}
          icon
          labelPosition="left"
          onClick={handleAddClick}
        >
          <Icon name="plus" /> Add Template
        </Button>

    

      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          message="Are you sure you want to delete this template?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={2500}
          onClose={() => setToast(null)}
        />
      )}

      <Header as="h2" textAlign="center">
        Templates
      </Header>

      <TemplateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTemplate(null);
        }}
        onSuccess={fetchTemplates}
        selectedTemplate={selectedTemplate}
      />

    {loading ? (
  <Table celled striped selectable compact>
    <Table.Header>
      <Table.Row >
        {[
          { header: "Name", textAlign: "center", width: 2 },
          { header: "Label", textAlign: "center", width: 2 },
          { header: "Created By", textAlign: "center", width: 2 },
          { header: "Created On", textAlign: "center", width: 2 },
          { header: "Description", textAlign: "center", width: 2 }, 
          { header: "Actions", textAlign: "center", width: 2 },
        ].map(({ header, textAlign, width }) => (
          <Table.HeaderCell
            key={header}
            style={{ backgroundColor: "#5f3d97ff", color: "white" }}
            textAlign={textAlign}
            width={width}
          >
            {header}
          </Table.HeaderCell>
        ))}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <LoadingSkeletonRows rows={6} />
    </Table.Body>
  </Table>
) : error ? (
  <Message negative header="Error" content={error} />
) : templates.length === 0 ? (
  <Message info header="No templates found" />
) : (
        <Table celled striped selectable compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2} textAlign="center">
                Name
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2} textAlign="center">
                Label
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2} textAlign="center">
                Created By
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} width={2} textAlign="center">
                Created On
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} textAlign="center">
                Description
              </Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97ff", color: "white" }} textAlign="center" width={2}>
                Actions
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {templates.map((template) => (
              <Table.Row key={template.id}>
                <Table.Cell>{template.name}</Table.Cell>

                <Table.Cell>
                  <Label color={getColorForLabel(template.label)}>{template.label}</Label>
                </Table.Cell>

                <Table.Cell>{template.createdBy}</Table.Cell>
                <Table.Cell>{template.createdOn}</Table.Cell>

                {/* ========== FIXED DESCRIPTION with underline support ========== */}
                <Table.Cell style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "250px" }}>
                  <ReactMarkdown
                    rehypePlugins={[
                      rehypeRaw,
                      [rehypeSanitize, underlineSchema]
                    ]}
                  >
                    {template.description || ""}
                  </ReactMarkdown>
                </Table.Cell>
                {/* ============================================================= */}

                <Table.Cell textAlign="center">
                  <Button
                    icon
                    color="blue"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(template);
                    }}
                    style={{ marginRight: "0.5em" }}
                  >
                    <Icon name="folder open" />
                  </Button>

                  <Button
                    icon
                    color="red"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(template.id);
                    }}
                  >
                    <Icon name="trash" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      
    </Container>
  );
};

export default Templates;
