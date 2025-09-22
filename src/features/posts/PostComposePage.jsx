import React, { useState } from 'react';
import PostTypeSelector from './PostTypeSelector/PostTypeSelector';
import QuestionForm from './QuestionForm/QuestionForm';
import ArticleForm from './ArticleForm/ArticleForm';
import PostButton from './PostButton/PostButton';
import { createQuestion, createArticle } from '../../services/posts';
import { useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import './postcomposepage.css';

export default function PostComposePage() {
    const [type, setType] = useState('question');
    const [question, setQuestion] = useState({ title: '', body: '', tags: '', imageFile: null });
    const [article, setArticle] = useState({ title: '', abstract: '', text: '', tags: '', imageFile: null });
    const [loading, setLoading] = useState(false);
    const [codeBlock, setCodeBlock] = useState('');
    const nav = useNavigate();

    const handlePost = async () => {
        try {
            setLoading(true);
            if (type === 'question') {
                await createQuestion(question);
                setQuestion({ title: '', body: '', tags: '', imageFile: null });
            } else {
                await createArticle(article);
                setArticle({ title: '', abstract: '', text: '', tags: '', imageFile: null });
            }
            alert('Posted successfully!');
            // 可按需跳转：nav('/posts/find');
        } catch (e) {
            console.error(e);
            alert(`Failed to post, please try again.`);
        } finally {
            setLoading(false);
        }
    };

    const insertCodeToBody = () => {
        const fenced = `\n\n\`\`\`js\n${(codeBlock || '').trim()}\n\`\`\`\n`;
        if (type === 'question') {
            setQuestion((prev) => ({ ...prev, body: (prev.body || '') + fenced }));
        } else {
            setArticle((prev) => ({ ...prev, text: (prev.text || '') + fenced }));
        }
    };

    // 预览：问题看 body，文章看 text
    const previewMd = type === 'question' ? (question.body || '') : (article.text || '');

    const isDisabled =
        (type === 'question' && !question.title.trim()) ||
        (type === 'article' && (!article.title.trim() || !article.abstract.trim()));

    return (
        <div className="compose-wrap card">
            {/* 顶部操作 */}
            <div className="top-actions">
                <Link to="/posts/find" className="linklike">← Back to Find</Link>
            </div>

            {/* 分栏布局 */}
            <div className="compose-grid">
                {/* 左侧：编辑区 */}
                <section className="compose-left">
                    <PostTypeSelector value={type} onChange={setType} />
                    <hr className="hr" />

                    {type === 'question'
                        ? <QuestionForm values={question} onChange={setQuestion} />
                        : <ArticleForm values={article} onChange={setArticle} />
                    }

                    <hr className="hr" />

                    {/* 代码编辑器 */}
                    <div className="editor-card card">
                        <div className="editor-header">
                            <strong className="section-title">Code (CodeMirror)</strong>
                            <button type="button" onClick={insertCodeToBody} className="btn">
                                Insert into paragraph
                            </button>
                        </div>

                        <CodeMirror
                            value={codeBlock}
                            extensions={[javascript({ jsx: true })]}
                            theme={oneDark}
                            height="300px"
                            basicSetup={{ lineNumbers: true }}
                            onChange={(val) => setCodeBlock(val)}
                        />

                    </div>

                    <div className="post-actions">
                        <PostButton onClick={handlePost} disabled={isDisabled} loading={loading} />
                    </div>
                </section>

                {/* 右侧：预览区 */}
                <aside className="compose-right">
                    <h3 className="section-title">Preview (Markdown)</h3>
                    <div className="preview-card card">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {previewMd}
                        </ReactMarkdown>
                    </div>
                </aside>
            </div>
        </div>
    );
}
