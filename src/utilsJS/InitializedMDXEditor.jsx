import '@mdxeditor/editor/style.css';

import React, { useState, useEffect } from "react";
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  diffSourcePlugin,
  toolbarPlugin,
  linkDialogPlugin,
  linkPlugin,
  BoldItalicUnderlineToggles,
  UndoRedo,
  CodeToggle,
  ListsToggle,
  DiffSourceToggleWrapper,
  CreateLink,
} from "@mdxeditor/editor";
import styles from '../styles/InitializedMDXEditor.module.css';

export default function InitializedMDXEditor({ editorRef, onFileSelected, ...props }) {

  return (
    <div>
      <MDXEditor
        editorRef={editorRef}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <div className={styles.toolbarContainer}>

                <UndoRedo />
                <BoldItalicUnderlineToggles />

                {props.name}

                <ListsToggle />
                <CodeToggle />
                <CreateLink />
                <DiffSourceToggleWrapper />

                {props.showFileUpload && (
                  <props.showFileUpload handleChange={props.handleFileChange} />
                )}

              </div>
            ),
          }),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          diffSourcePlugin(),
          linkDialogPlugin(),
          linkPlugin(),
        ]}
        {...props}
      />
    </div>
  );
}
