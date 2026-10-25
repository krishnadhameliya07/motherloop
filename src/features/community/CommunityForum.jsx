import { useState } from 'react'
import { createCareId } from '../../careStorage'
import {
  TOPICS,
  MAX_POST_LENGTH,
  MAX_REPLY_LENGTH,
  loadCommunity,
  saveCommunity,
} from '../../communityStorage'

function topicLabel(id) {
  return TOPICS.find(topic => topic.id === id)?.label || '#community'
}

function timeAgo(iso, now) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`

  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export default function CommunityForum() {
  const [data, setData] = useState(() => loadCommunity())
  // Reference time for "x min ago" labels. New posts are newer than
  // this value, so they correctly show as "just now".
  const [now] = useState(() => Date.now())
  const [draft, setDraft] = useState('')
  const [draftTopic, setDraftTopic] = useState('selfcare')
  const [filter, setFilter] = useState('all')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const [status, setStatus] = useState('')

  function commit(next) {
    if (saveCommunity(next)) {
      setData(next)
      return true
    }

    setStatus('Could not save in this browser. Please try again.')
    return false
  }

  function handlePost(event) {
    event.preventDefault()

    const text = draft.trim()
    if (!text) return

    const post = {
      id: createCareId('post'),
      text: text.slice(0, MAX_POST_LENGTH),
      topic: draftTopic,
      cheers: 0,
      replies: [],
      timestamp: new Date().toISOString(),
      isExample: false,
    }

    if (commit({ ...data, posts: [post, ...data.posts] })) {
      setDraft('')
      setFilter('all')
      setStatus('Posted anonymously. 💗')
    }
  }

  function toggleCheer(postId) {
    const cheered = data.cheeredIds.includes(postId)

    commit({
      posts: data.posts.map(post =>
        post.id === postId
          ? { ...post, cheers: Math.max(0, post.cheers + (cheered ? -1 : 1)) }
          : post
      ),
      cheeredIds: cheered
        ? data.cheeredIds.filter(id => id !== postId)
        : [...data.cheeredIds, postId],
    })
  }

  function handleReply(postId) {
    const text = replyText.trim()
    if (!text) return

    const reply = {
      id: createCareId('reply'),
      text: text.slice(0, MAX_REPLY_LENGTH),
      timestamp: new Date().toISOString(),
    }

    const saved = commit({
      ...data,
      posts: data.posts.map(post =>
        post.id === postId
          ? { ...post, replies: [...post.replies, reply] }
          : post
      ),
    })

    if (saved) {
      setReplyText('')
      setReplyingTo(null)
      setExpanded(previous => new Set(previous).add(postId))
    }
  }

  function deletePost(postId) {
    if (!window.confirm('Delete this post and its replies?')) return

    commit({
      posts: data.posts.filter(post => post.id !== postId),
      cheeredIds: data.cheeredIds.filter(id => id !== postId),
    })
    setStatus('Post deleted.')
  }

  function toggleExpanded(postId) {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const visiblePosts =
    filter === 'all'
      ? data.posts
      : data.posts.filter(post => post.topic === filter)

  return (
    <section className="checkin-page community-page">
      <span className="eyebrow">YOU ARE NOT ALONE</span>
      <h2>Community 🤝</h2>
      <p className="page-description">
        An anonymous space to share wins, worries and encouragement with other
        mothers.
      </p>

      <div className="community-preview-note" role="note">
        <strong>Preview mode</strong>
        <span>
          Posts are saved only in this browser on this device and are not yet
          shared with other mothers. Posts marked &ldquo;Example&rdquo; are
          sample content.
        </span>
      </div>

      <form className="form-panel community-composer" onSubmit={handlePost}>
        <label className="field-label">
          Share anonymously
          <textarea
            rows={3}
            maxLength={MAX_POST_LENGTH}
            value={draft}
            onChange={event => {
              setDraft(event.target.value)
              setStatus('')
            }}
            placeholder="What's on your mind? Please don't include names or personal details."
          />
        </label>

        <div className="composer-row">
          <label className="composer-topic">
            Topic
            <select
              value={draftTopic}
              onChange={event => setDraftTopic(event.target.value)}
            >
              {TOPICS.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </label>

          <span className="composer-count">
            {draft.length}/{MAX_POST_LENGTH}
          </span>

          <button
            className="primary-button"
            type="submit"
            disabled={!draft.trim()}
          >
            Post
          </button>
        </div>

        {status && (
          <p className="status-message" role="status">
            {status}
          </p>
        )}
      </form>

      <div className="topic-filters" role="group" aria-label="Filter by topic">
        {[{ id: 'all', label: 'All posts' }, ...TOPICS].map(topic => (
          <button
            type="button"
            key={topic.id}
            className={`topic-chip ${filter === topic.id ? 'active' : ''}`}
            aria-pressed={filter === topic.id}
            onClick={() => setFilter(topic.id)}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {visiblePosts.length === 0 ? (
        <div className="empty-state">
          <span>💬</span>
          <h4>No posts here yet</h4>
          <p>Be the first to share something in this topic.</p>
        </div>
      ) : (
        <div className="community-feed">
          {visiblePosts.map(post => {
            const cheered = data.cheeredIds.includes(post.id)
            const isExpanded = expanded.has(post.id)

            return (
              <article className="community-post" key={post.id}>
                <div className="post-meta">
                  <span className="post-avatar" aria-hidden="true">🌸</span>
                  <strong>Anonymous mama</strong>
                  <span className="post-topic">{topicLabel(post.topic)}</span>
                  {post.isExample && (
                    <span className="post-example">Example</span>
                  )}
                  <span className="post-time">{timeAgo(post.timestamp, now)}</span>
                </div>

                <p className="post-text">{post.text}</p>

                <div className="post-actions">
                  <button
                    type="button"
                    className={`text-button cheer-button ${cheered ? 'cheered' : ''}`}
                    aria-pressed={cheered}
                    onClick={() => toggleCheer(post.id)}
                  >
                    {cheered ? '💗' : '🤍'} {post.cheers}{' '}
                    {post.cheers === 1 ? 'cheer' : 'cheers'}
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setReplyingTo(replyingTo === post.id ? null : post.id)
                      setReplyText('')
                    }}
                  >
                    💬 Reply
                  </button>

                  {post.replies.length > 0 && (
                    <button
                      type="button"
                      className="text-button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(post.id)}
                    >
                      {isExpanded ? 'Hide' : 'Show'} {post.replies.length}{' '}
                      {post.replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="text-button danger-text post-delete"
                    onClick={() => deletePost(post.id)}
                  >
                    Delete
                  </button>
                </div>

                {replyingTo === post.id && (
                  <div className="reply-composer">
                    <input
                      value={replyText}
                      maxLength={MAX_REPLY_LENGTH}
                      onChange={event => setReplyText(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleReply(post.id)
                        }
                      }}
                      placeholder="Write a supportive reply…"
                      aria-label="Reply"
                    />
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!replyText.trim()}
                      onClick={() => handleReply(post.id)}
                    >
                      Reply
                    </button>
                  </div>
                )}

                {isExpanded && post.replies.length > 0 && (
                  <div className="reply-list">
                    {post.replies.map(reply => (
                      <div className="reply" key={reply.id}>
                        <span>
                          Anonymous mama · {timeAgo(reply.timestamp, now)}
                        </span>
                        <p>{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="storage-note">
        Be kind. This space is for peer support, not medical advice. If you
        are worried about your health or your baby&apos;s, contact your
        healthcare professional.
      </p>
    </section>
  )
}
