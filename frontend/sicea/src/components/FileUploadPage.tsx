import React from 'react';
import NavBar from './NavBar';
import FileUpload from './FileUpload';

const FileUploadPage: React.FC = () => {
  return (
    <div>
      <NavBar />
      <div>
        <FileUpload />
      </div>
    </div>
  );
};

export default FileUploadPage;
