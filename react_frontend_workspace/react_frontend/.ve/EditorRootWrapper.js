import React, { useState, useEffect } from 'react';
import EditorOverlay from './EditorOverlay';
import SidePanel from './SidePanel';

export default function EditorRootWrapper({ children }) {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isEditOverlayActive, setIsEditOverlayActive] = useState(false);

  useEffect(() => {
    if (isEditOverlayActive) {
      document.body.classList.add('edit-mode-active');
    } else {
      document.body.classList.remove('edit-mode-active');
    }

    // Optional cleanup (runs on unmount)
    return () => {
      document.body.classList.remove('edit-mode-active');
    };
  }, [isEditOverlayActive]);

  const handleSelect = (id, element) => {
    setSelectedId(id);
    setSelectedElement(element);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedElement(null);
  };

  const toggleEditOverlay = () => {
    setIsEditOverlayActive((prev) => {
      const next = !prev;
      if (!next) {
        clearSelection();
      }
      return next;
    });
  };

  return (
    <>

      {/* The actual app content */}
      {children}

      {/* Editor overlay */}
      {isEditOverlayActive && (
         <div style={{ position: 'relative', zIndex: 10000 }}>
           <EditorOverlay onSelect={handleSelect} />
         </div>
       )}

      {/* Toggle button */}
      <div id="editor-panel">
        <button
          onClick={toggleEditOverlay}
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            zIndex: 10001,
            padding: '0.5rem 1rem',
            background: isEditOverlayActive ? '#f90' : '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isEditOverlayActive ? 'Disable Edit Mode' : 'Enable Edit Mode'}
        </button>
      </div>

      {/* Side panel */}
      {selectedId && (
        <div id="editor-panel" style={{ position: 'relative', zIndex: 10001 }}>
          <SidePanel
            selectedId={selectedId}
            selectedElement={selectedElement}
            onClose={clearSelection}
          />
        </div>
      )}
    </>
  );
}
