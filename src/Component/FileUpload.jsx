import React from 'react'

const FileUpload = ({handleChange}) => {
  return (
    <div>
        <input onChange={handleChange} type="file" />
    </div>
  )
}

export default FileUpload