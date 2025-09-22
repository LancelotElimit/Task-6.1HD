import React from 'react';
import PropTypes from 'prop-types';
import './PostButton.css';

export default function PostButton({ onClick, disabled = false, loading = false }) {
    return (
        <button
            type="button"
            className={`pb-btn ${disabled ? 'pb-disabled' : ''}`}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label="Post"
        >
            {loading ? 'Posting…' : 'Post'}
            {!loading && (
                <svg className="pb-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 21l20-9L2 3v7l14 2-14 2v7z"></path>
                </svg>
            )}
        </button>
    );
}

PostButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
};
