"use client";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  applyEdgeChanges, 
  applyNodeChanges,
  MarkerType 
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Table, Button, Icon, Container, Header, Label, Dimmer, Loader, Segment, Popup
} from "semantic-ui-react";
import axiosInstance from "@/utilsJS/axiosInstance";

const Chats = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); 
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const router = useRouter();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/templates/");
      setTemplates(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const getColorForLabel = (label) => {
    switch (label) {
      case "Urgent": return "red";
      case "Enquiry": return "yellow";
      case "Normal": return "blue";
      default: return "grey";
    }
  };

  const generateGraph = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return;

    const sorted = [...subtasks].sort((a, b) => a.id - b.id);

    const newNodes = sorted.map((task, index) => ({
      // Using task.id as the identifier is safer than the action name
      id: String(task.id), 
      data: { 
        label: (
          <Popup
            trigger={
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                width: '100%', 
                minHeight: '60px',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                border: '1px solid #ddd',
                cursor: 'pointer'
              }}>
                {/* LEFT SIDE: Action Name */}
                <div style={{ 
                  backgroundColor: '#4a4e69', 
                  color: 'white', 
                  padding: '10px', 
                  width: '60%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>STEP {index + 1}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{task.action}</div>
                </div>

                {/* RIGHT SIDE: Assignee */}
                <div style={{ 
                  backgroundColor: '#d9deec', 
                  color: '#333', 
                  padding: '10px', 
                  width: '40%',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderLeft: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <Icon name="user circle" style={{ marginRight: '5px' }} />
                  {task.assignee || "@Unassigned"}
                </div>
              </div>
            }
            // Tooltip Content
            header={task.action}
            content={task.description || "No description provided for this step."}
            position="top center"
            inverted
            hoverable
          />
        ) 
      },
      position: { x: 250, y: index * 120 }, 
      style: { background: 'none', border: 'none', width: 350, padding: 0 }
    }));

    const newEdges = [];
    sorted.forEach((task) => {
      if (task.dependsOn) {
        const parentRefs = String(task.dependsOn).split(",");
        parentRefs.forEach(ref => {
          const trimmedRef = ref.trim();
          // Find parent by ID or Name
          const parent = sorted.find(t => String(t.id) === trimmedRef || t.action === trimmedRef);
          
          if (parent) {
            newEdges.push({
              id: `edge-${parent.id}-${task.id}`,
              source: String(parent.id),
              target: String(task.id),
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#f2711c' },
              style: { stroke: '#f2711c', strokeWidth: 3, strokeDasharray: '5,5' }
            });
          }
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleOpenWorkflow = async (template) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/templates/${template.id}`);
      if (res.data) {
        setSelectedTemplate(res.data);
        generateGraph(res.data.subtasks);
        setView("workflow");
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const onNodesChange = useCallback((chs) => setNodes((nds) => applyNodeChanges(chs, nds)), []);
  const onEdgesChange = useCallback((chs) => setEdges((eds) => applyEdgeChanges(chs, eds)), []);

  if (view === "workflow") {
    return (
      <Container fluid style={{ marginTop: "2em", padding: "0 20px" }}>
        {loading && <Dimmer active inverted><Loader size="large">Loading Flow...</Loader></Dimmer>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
          <Button icon labelPosition="left" style={{ backgroundColor: "#5f3d97", color: "white" }} onClick={() => setView("table")}>
            <Icon name="arrow left" /> Back
          </Button>
          <Header as="h2">{selectedTemplate?.name}</Header>
          <div style={{ width: '100px' }}></div>
        </div>

        <div style={{ width: '100%', height: '75vh', border: '2px solid #5f3d97', borderRadius: '12px', background: '#f4f4f9' }}>
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            fitView
          >
            <Background variant="lines" color="#ddd" />
            <Controls />
          </ReactFlow>
        </div>
      </Container>
    );
  }

  return (
    <Container style={{ marginTop: "2em" }}>
      <Header as="h2" textAlign="center">Template Workflows</Header>
      <Button style={{ backgroundColor: "#5F3D97", color: "#fff", marginBottom: '1em' }} icon labelPosition="left" onClick={() => router.push("/Landing")}>
        <Icon name="arrow left" /> Back
      </Button>
      <Segment basic style={{ minHeight: '200px', padding: 0 }}>
        {loading && <Dimmer active inverted><Loader size="medium">Loading...</Loader></Dimmer>}
        <Table celled striped compact selectable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97", color: "white" }}>Name</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97", color: "white" }} textAlign="center">Label</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97", color: "white" }} textAlign="center">Created By</Table.HeaderCell>
              <Table.HeaderCell style={{ backgroundColor: "#5f3d97", color: "white" }} textAlign="center">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {templates.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell><strong>{t.name}</strong></Table.Cell>
                <Table.Cell textAlign="center"><Label color={getColorForLabel(t.label)}>{t.label}</Label></Table.Cell>
                <Table.Cell textAlign="center">{t.createdBy}</Table.Cell>
                <Table.Cell textAlign="center">
                  <Button size="small" style={{ backgroundColor: "#5f3d97", color: "white" }} onClick={() => handleOpenWorkflow(t)}>
                    <Icon name="eye" /> View Graph
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Segment>
    </Container>
  );
};

export default Chats;