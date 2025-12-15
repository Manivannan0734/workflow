"use client";
import { useState, useCallback } from "react";
import ChatMessage from "../Component/ChatMessage";
import axiosInstance from "@/utilsJS/axiosInstance";
import { Button,Icon } from "semantic-ui-react";
import { useRouter } from "next/router";
export default function OllamaChat() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingMessage, setTypingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   const router = useRouter();
  const typeWriterEffect = useCallback((text, callback) => {
    let index = 0;
    setTypingMessage("");
    const speed = 18;

    const interval = setInterval(() => {
      setTypingMessage((prev) => prev + text[index]);
      index++;
      if (index === text.length) {
        clearInterval(interval);
        callback();
      }
    }, speed);

    return () => clearInterval(interval);
  }, []);

  const sendPrompt = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMsg = prompt.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setPrompt("");
    setTypingMessage("");
    setIsLoading(true);


    try {
      const res = await axiosInstance.post("/ollama/", {
        model: "gemma3:1b",
        prompt: userMsg,
        stream: false,
      });

      const botReply = res.data.response || "No response.";

      typeWriterEffect(botReply, () => {
        setMessages((prev) => [...prev, { role: "assistant", content: botReply }]);
        setTypingMessage("");
        setIsLoading(false);
      });
    } catch (err) {
      const errorMsg = "something went wrong, please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
      setTypingMessage("");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };
    function handleBack(){
    router.push('/Landing');
}
  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "40px auto",
        padding: "0 20px",
      }}
      
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        Gemma3 AI Chat
      </h2>
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
      <div
        style={{
          height: "25rem",
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "10px",
          background: "#FAFAFA",
        }}
      >
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} message={msg.content} />
        ))}

        {typingMessage && (
          <ChatMessage role="assistant" message={typingMessage + " ▌"} />
        )}
      </div>

      {/* Input Section */}
      <div style={{ display: "flex", marginTop: "20px" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{
            flexGrow: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
            resize: "none",
          }}
          placeholder="Type message... (Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
        />

        <button
          onClick={sendPrompt}
          disabled={!prompt.trim() || isLoading}
          style={{
            marginLeft: "10px",
            padding: "12px 24px",
            background: isLoading ? "#78609eff" : "#5f3d97ff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
