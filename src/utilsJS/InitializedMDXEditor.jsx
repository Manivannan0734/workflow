
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
  BlockTypeSelect,
  CodeToggle,
  ListsToggle,
  DiffSourceToggleWrapper,
  CreateLink,
} from "@mdxeditor/editor";
import styles from '../styles/InitializedMDXEditor.module.css';

export default function InitializedMDXEditor({ editorRef, onFileSelected, ...props }) {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div>
      <MDXEditor
        editorRef={editorRef}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <div className={styles.toolbarContainer}>
                <div className={styles.alwaysVisible}>
                  <UndoRedo />
                  <BoldItalicUnderlineToggles />
                </div>

                <div className={isMobile ? styles.hiddenOnMobile : styles.showOnDesktop}>
                  {props.name}
                  <ListsToggle />
                  <CodeToggle />
                  <CreateLink />
                  <DiffSourceToggleWrapper />
                  {
                    props.showFileUpload &&
                    <props.showFileUpload handleChange={props.handleFileChange} />
                  }



                </div>

                <div className={isMobile ? styles.mobileContainer : styles.mobileContainerHidden}>
                  <button
                    onClick={toggleMenu}
                    className={styles.ellipsisButton}
                    aria-label="More options"
                  >
                    ⋯
                  </button>

                  {isMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.menuItem}>
                        <ListsToggle />
                      </div>
                      <div className={styles.menuItem}>
                        <CodeToggle />
                      </div>
                      <div className={styles.menuItem}>
                        <CreateLink />
                      </div>
                      <div className={styles.menuItem}>
                        <DiffSourceToggleWrapper />
                      </div>
                      {
                        props.showFileUpload &&
                        (
                          <div className={styles.menuItem}>
                            <props.showFileUpload />
                          </div>
                        )
                      }

                    </div>
                  )}
                </div>
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
