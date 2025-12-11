import React, { useEffect, useState } from "react";
import { Confirm } from "semantic-ui-react";

const ConfirmModal = ({ open, onCancel, onConfirm, header, content }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
  }, []);

  if (!isClient) return null; 

  return (
    <Confirm
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      header={header || "Confirmation"}
      content={content || "Are you sure?"}
      size="mini"
    />
  );
};

export default ConfirmModal;
