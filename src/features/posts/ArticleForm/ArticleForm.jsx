import React from 'react';
import PropTypes from 'prop-types';
import './ArticleForm.css';

export default function ArticleForm({ values, onChange }) {
    const safe = {
        title: values?.title ?? '',
        abstract: values?.abstract ?? '',
        text: values?.text ?? '',
        tags: values?.tags ?? '',
        imageFile: values?.imageFile ?? null,
    };

    const handle = (e) => {
        const { name, value } = e.target;
        onChange({ ...safe, [name]: value });
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0] ?? null;
        onChange({ ...safe, imageFile: file });
    };

    return (
        <form className="af-form">
            <div className="af-field">
                <label htmlFor="af-title">Title<span className="af-req">*</span></label>
                <input id="af-title" name="title" type="text"
                       placeholder="Enter a clear, descriptive title"
                       value={safe.title} onChange={handle} required />
            </div>

            <div className="af-field">
                <label htmlFor="af-abstract">Abstract<span className="af-req">*</span></label>
                <textarea id="af-abstract" name="abstract"
                          placeholder="Write your article abstract here…"
                          value={safe.abstract} onChange={handle} rows={4} required />
                <div className="af-hint">{safe.abstract.length}/5000</div>
            </div>

            <div className="af-field">
                <label htmlFor="af-text">Full Text</label>
                <textarea id="af-text" name="text"
                          placeholder="Write your article text here"
                          value={safe.text} onChange={handle} rows={12} />
            </div>

            <div className="af-field">
                <label htmlFor="af-tags">Tags</label>
                <input id="af-tags" name="tags" type="text"
                       placeholder="e.g. javascript, frontend (comma-separated)"
                       value={safe.tags} onChange={handle} />
            </div>

            <div className="af-field">
                <label htmlFor="af-image">Cover Image (optional)</label>
                <input id="af-image" name="imageFile" type="file" accept="image/*" onChange={handleFile} />
            </div>
        </form>
    );
}

ArticleForm.propTypes = {
    values: PropTypes.shape({
        title: PropTypes.string,
        abstract: PropTypes.string,
        text: PropTypes.string,
        tags: PropTypes.string,
    }).isRequired,
    onChange: PropTypes.func.isRequired,
};
