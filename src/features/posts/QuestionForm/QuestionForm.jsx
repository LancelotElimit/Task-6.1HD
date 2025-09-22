import React from 'react';
import PropTypes from 'prop-types';
import './QuestionForm.css';

export default function QuestionForm({ values, onChange }) {
    // ✅ 安全兜底，避免 values 未初始化时报错
    const safe = {
        title: values?.title ?? '',
        body: values?.body ?? '',
        tags: values?.tags ?? '',
        imageFile: values?.imageFile ?? null,
    };

    const handle = (e) => {
        const { name, value } = e.target;
        onChange({ ...safe, [name]: value });
    };

    const handleBlurTrim = (e) => {
        const { name, value } = e.target;
        onChange({ ...safe, [name]: value.trim() });
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0] ?? null;
        onChange({ ...safe, imageFile: file });
    };

    return (
        <form className="qf-form">
            <div className="qf-field">
                <label htmlFor="qf-title">
                    Title<span className="qf-req">*</span>
                </label>
                <input
                    id="qf-title"
                    name="title"
                    type="text"
                    placeholder="What's your question?"
                    value={safe.title}
                    onChange={handle}
                    onBlur={handleBlurTrim}
                    required
                />
            </div>

            <div className="qf-field">
                <label htmlFor="qf-body">
                    Details<span className="qf-req">*</span>
                </label>
                <textarea
                    id="qf-body"
                    name="body"
                    placeholder="Describe the problem, what you tried, and expected vs. actual results…"
                    value={safe.body}
                    onChange={handle}
                    onBlur={handleBlurTrim}
                    rows={8}
                    maxLength={2000}          // ✅ 给上限，和计数配套
                    required                  // ✅ 后端必填，这里同步
                />
                <div className="qf-hint">
                    {safe.body.length}/2000
                </div>
            </div>

            <div className="qf-field">
                <label htmlFor="qf-tags">Tags</label>
                <input
                    id="qf-tags"
                    name="tags"
                    type="text"
                    placeholder="e.g. react, firebase (comma-separated)"
                    value={safe.tags}
                    onChange={handle}
                    onBlur={handleBlurTrim}
                />
            </div>

            <div className="qf-field">
                <label htmlFor="qf-image">Image (optional)</label>
                <input
                    id="qf-image"
                    name="imageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                />
            </div>
        </form>
    );
}

QuestionForm.propTypes = {
    values: PropTypes.shape({
        title: PropTypes.string,
        body: PropTypes.string,
        tags: PropTypes.string,
        imageFile: PropTypes.any,
    }).isRequired,
    onChange: PropTypes.func.isRequired,
};
