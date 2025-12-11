import React from "react";
import { Pagination as SUIPagination, Dropdown } from "semantic-ui-react";

const Pagination = ({
  activePage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}) => {
  const pageSizeOptions = [
    { key: 5, text: "5", value: 5 },
    { key: 10, text: "10", value: 10 },
    { key: 15, text: "15", value: 15 },
    { key: 20, text: "20", value: 20 },
  ];

  return (
    <div
      style={{
        marginTop: "1em",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1em",
      }}
    >
      <SUIPagination
        boundaryRange={0}
        activePage={activePage}
        onPageChange={onPageChange}
        siblingRange={1}
        totalPages={totalPages}
        ellipsisItem={null}
        firstItem={null}
        lastItem={null}
        size="mini"
      />

      <Dropdown
       
        selection
        compact
        options={pageSizeOptions}
        value={pageSize}
        onChange={(_, { value }) => onPageSizeChange(value)}
      />
    </div>
  );
};

export default Pagination;
