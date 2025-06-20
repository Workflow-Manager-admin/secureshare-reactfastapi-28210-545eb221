import React, { useEffect } from 'react';
import './EditorOverlay.css';

export default function EditorOverlay({ onSelect }) {
  useEffect(() => {
    const handleClick = (e) => {
      // Skip if clicking inside #editor-panel
      if (e.target.closest('#editor-panel')) {
        return;
      }

      const el = e.currentTarget;
      const id = el.getAttribute('data-editor-id');
      onSelect(id, el);
      e.stopPropagation();
      e.preventDefault();
    };

    const handleMouseEnter = (e) => {
      if (e.target.closest('#editor-panel')) {
        return;
      }
      e.currentTarget.classList.add('editor-highlight');
      e.currentTarget.classList.add('edit-mode-active');
    };

    const handleMouseLeave = (e) => {
      if (e.target.closest('#editor-panel')) {
        return;
      }
      e.currentTarget.classList.remove('editor-highlight');
      e.currentTarget.classList.remove('edit-mode-active');
    };

    const elements = document.querySelectorAll('[data-editor-id]');
    elements.forEach((el) => {
      el.addEventListener('click', handleClick);
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      elements.forEach((el) => {
        el.removeEventListener('click', handleClick);
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.classList.remove('editor-highlight'); // clean up on unmount
      });
    };
  }, [onSelect]);

  return null; // purely side effects, no visible render
}
