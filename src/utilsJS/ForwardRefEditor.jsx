'use client';
// ForwardRefEditor.jsx
import dynamic from 'next/dynamic';
import React, { forwardRef } from 'react';

// Dynamically import InitializedMDXEditor with SSR off

const Editor = dynamic(() => import('../utilsJS/InitializedMDXEditor'), { ssr: false });

export const ForwardRefEditor = forwardRef((props, ref) => <Editor {...props} editorRef={ref} />);
ForwardRefEditor.displayName = 'ForwardRefEditor';
