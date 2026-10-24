import { useState } from 'react';
import { API_URL } from '../config/api';

const getInitialFormData = (editItem) => {
  const isStoredCoverEndpoint = editItem?.cover_image?.startsWith(`${API_URL}/`)
    && editItem.cover_image.endsWith('/cover');
  return {
    title: editItem?.title || '',
    year: editItem?.year || '',
    label: editItem?.label || '',
    barcode: editItem?.barcode || '',
    format: editItem?.format || 'CD',
    cover_image: isStoredCoverEndpoint ? '' : (editItem?.cover_image || ''),
    notes: editItem?.notes || ''
  };
};

export default function ManualAddModal({ onClose, onAdded, editItem, listType = 'collection' }) {
  const isEditing = !!editItem;

  const [formData, setFormData] = useState(() => getInitialFormData(editItem));
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'year' ? value.replace(/\D/g, '').slice(0, 4) : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('Image size must be 3MB or smaller');
        setImageFile(null);
      } else {
        setError('');
        setImageFile(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Title is required!');
    if (!/^\d{4}$/.test(formData.year)) {
      setError('Year must contain exactly 4 digits.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `${API_URL}/${listType}/${editItem.id}` : `${API_URL}/${listType}`;
      const method = isEditing ? 'PUT' : 'POST';

      const data = new FormData();
      data.append('title', formData.title);
      data.append('year', formData.year);
      data.append('label', formData.label);
      data.append('barcode', formData.barcode);
      data.append('format', formData.format);
      data.append('notes', formData.notes);
      
      // If a file is selected, append it. Otherwise, append the URL string.
      if (imageFile) {
        data.append('cover_image_file', imageFile);
      } else if (formData.cover_image) {
        data.append('cover_image', formData.cover_image);
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (response.ok) {
        onAdded();
        onClose();
      } else {
        const err = await response.json().catch(() => null);
        setError(err?.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2>{isEditing ? 'Edit Release' : 'Add Release Manually'}</h2>
        
        {error && <p style={{color: '#ff3b30', fontSize: '14px', marginBottom: '16px'}}>{error}</p>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div>
            <label>Artist / Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          
          <div style={{display: 'flex', gap: '16px'}}>
            <div style={{flex: 1}}>
              <label>Year</label>
              <input
                type="text"
                name="year"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                title="Enter a four-digit year, such as 1994."
                placeholder="1994"
                value={formData.year}
                onChange={handleChange}
              />
            </div>
            <div style={{flex: 1}}>
              <label>Format *</label>
              <select name="format" value={formData.format} onChange={handleChange}>
                <option value="CD">CD</option>
                <option value="Vinyl">Vinyl</option>
                <option value="Cassette">Tape</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="release-label">Label</label>
            <input
              id="release-label"
              type="text"
              name="label"
              maxLength={255}
              placeholder="Record label (optional)"
              value={formData.label}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="release-barcode">Barcode</label>
            <input
              id="release-barcode"
              type="text"
              name="barcode"
              maxLength={100}
              placeholder="Barcode (optional)"
              value={formData.barcode}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Cover Image</label>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <input 
                type="url" 
                name="cover_image" 
                value={formData.cover_image} 
                onChange={handleChange} 
                placeholder="https://example.com/image.jpg" 
                disabled={!!imageFile} // Disable URL input if a file is chosen
              />
              <span style={{fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center'}}>- OR -</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer'}}
              />
              {imageFile && <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Selected: {imageFile.name}</span>}
            </div>
          </div>

          <div>
            <label>Personal Notes</label>
            <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange}></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{flex: 1}}>Cancel</button>
            <button type="submit" className="btn" disabled={isSubmitting} style={{flex: 1}}>
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add to Collection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}