import React from 'react';
import PropTypes from 'prop-types';
import './PostTypeSelector.css';

export default function PostTypeSelector({ value, onChange }) {
    return (
        <form className="pts-form" aria-labelledby="post-type-label">
            <h2>New Post</h2>
            <div className="pts-inline">
                <span id="post-type-label" className="pts-label">Post type</span>

                <label className="pts-radio">
                    <input
                        type="radio"
                        name="postType"
                        value="question"
                        checked={value === 'question'}
                        onChange={() => onChange('question')}
                    />
                    <span>Question</span>
                </label>

                <label className="pts-radio">
                    <input
                        type="radio"
                        name="postType"
                        value="article"
                        checked={value === 'article'}
                        onChange={() => onChange('article')}
                    />
                    <span>Article</span>
                </label>
            </div>
        </form>
    );
}

PostTypeSelector.propTypes = {
    value: PropTypes.oneOf(['question', 'article']).isRequired,
    onChange: PropTypes.func.isRequired,
};
