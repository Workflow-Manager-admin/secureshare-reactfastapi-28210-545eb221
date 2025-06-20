import React, { useState, useEffect } from 'react';

function toHexColor(color) {
  if (color.startsWith('#')) {
    return color;
  }

  const tempEl = document.createElement('div');
  tempEl.style.color = color;
  document.body.appendChild(tempEl);
  const computed = window.getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);

  const rgbaMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);

    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  return '#ffffff';
}

function getDirectText(el) {
  let text = '';
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  });
  return text.trim();
}

function getBackendUrl(backendPort = 4000) {
  return `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
}

export default function SidePanel({ selectedId, selectedElement, onClose }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [useBackgroundColor, setUseBackgroundColor] = useState(false);

  useEffect(() => {
    if (selectedElement) {
      selectedElement.classList.remove('editor-highlight');

      const computedStyle = window.getComputedStyle(selectedElement);

      const directText = getDirectText(selectedElement);
      setText(directText);
      setColor(toHexColor(computedStyle.color));

      // Check background alpha — if transparent, don’t set as active
      const bgMatch = computedStyle.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
      if (bgMatch) {
        const a = bgMatch[4] !== undefined ? parseFloat(bgMatch[4]) : 1;
        if (a === 0) {
          setUseBackgroundColor(false);
        } else {
          setUseBackgroundColor(false);
          setBgColor(toHexColor(computedStyle.backgroundColor));
        }
      } else {
        setUseBackgroundColor(false);
      }

      selectedElement.classList.add('editor-highlight');
    }
  }, [selectedElement]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (selectedElement) {
      selectedElement.textContent = e.target.value;
    }
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
    if (selectedElement) {
      selectedElement.style.color = e.target.value;
    }
  };

  const handleBgColorChange = (e) => {
    setBgColor(e.target.value);
    if (selectedElement && useBackgroundColor) {
      selectedElement.style.backgroundColor = e.target.value;
    }
  };

  const handleSave = async () => {
    const payload = {
      id: selectedId,
      changes: {
        text,
        style: {
          color,
        },
      },
    };

    if (useBackgroundColor) {
      payload.changes.style.backgroundColor = bgColor;
    }

    console.log('payload:', JSON.stringify(payload));

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/save-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        //alert('Changes saved!');
      } else {
        alert('Failed to save changes.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving changes.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        background: '#fff',
        borderLeft: '1px solid #ddd',
        padding: '1rem',
        width: '300px',
        height: '100%',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'transparent',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
        }}
        aria-label="Close panel"
      >
        ×
      </button>
      <h3 style={{ color: '#000', fontSize: '20px', lineHeight: '1.2', margin: 0, padding: '0.5rem 0' }}>Editor Panel</h3>
      <p style={{ color: '#000' }}>
        <strong>ID:</strong> {selectedId}
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#000' }}>
          Text:
        </label>
        <textarea value={text} onChange={handleTextChange} style={{ width: '100%', minHeight: '60px' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#000' }}>
          Text Color:
        </label>
        <input type="color" value={color} onChange={handleColorChange} style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#000' }}>
          Background Color:
        </label>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#000' }}>
          <input
            type="checkbox"
            checked={useBackgroundColor}
            onChange={(e) => {
              setUseBackgroundColor(e.target.checked);
              if (!e.target.checked && selectedElement) {
                selectedElement.style.backgroundColor = '';
              }
            }}
            style={{ marginRight: '0.5rem' }}
          />
          Apply Background Color
        </label>

        {useBackgroundColor ? (
          <input type="color" value={bgColor} onChange={handleBgColorChange} style={{ width: '100%' }} />
        ) : (
          <div style={{ fontSize: '0.9rem', color: '#555' }}>Transparent (inherits from CSS)</div>
        )}
      </div>

      <button style={{ width: '100%' }} onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
