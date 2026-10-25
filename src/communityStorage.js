// Local storage for the Community forum (from Fourth Trimester).
// Posts live only in this browser: there is no server sync yet.

const COMMUNITY_KEY = 'motherloop-community-v1'
const MAX_POSTS = 200

export const MAX_POST_LENGTH = 1000
export const MAX_REPLY_LENGTH = 500

export const TOPICS = [
  { id: 'selfcare', label: '#selfcare' },
  { id: 'breastfeeding', label: '#breastfeeding' },
  { id: 'mentalhealth', label: '#mentalhealth' },
  { id: 'recovery', label: '#recovery' },
  { id: 'newborn', label: '#newborn' },
]

const TOPIC_IDS = new Set(TOPICS.map(topic => topic.id))

function seedPosts() {
  const now = Date.now()

  return [
    {
      id: 'seed-1',
      text: 'Just had my first full 4 hours of sleep in 3 weeks. Feeling like a new human! 🌸',
      topic: 'recovery',
      cheers: 12,
      replies: [
        {
          id: 'seed-r1',
          text: 'That is such a huge win! So happy for you.',
          timestamp: new Date(now - 1800000).toISOString(),
        },
      ],
      timestamp: new Date(now - 3600000).toISOString(),
      isExample: true,
    },
    {
      id: 'seed-2',
      text: "Does anyone else feel guilty for wanting a break? I love my baby but I'm just so tired.",
      topic: 'mentalhealth',
      cheers: 24,
      replies: [
        {
          id: 'seed-r2',
          text: 'Every single one of us feels this. You are not alone and you are a great mom.',
          timestamp: new Date(now - 5400000).toISOString(),
        },
      ],
      timestamp: new Date(now - 7200000).toISOString(),
      isExample: true,
    },
  ]
}

function cleanReply(reply) {
  if (
    !reply ||
    typeof reply.id !== 'string' ||
    typeof reply.text !== 'string' ||
    typeof reply.timestamp !== 'string'
  ) {
    return null
  }

  return {
    id: reply.id,
    text: reply.text.slice(0, MAX_REPLY_LENGTH),
    timestamp: reply.timestamp,
  }
}

function cleanPost(post) {
  if (
    !post ||
    typeof post.id !== 'string' ||
    typeof post.text !== 'string' ||
    !post.text.trim() ||
    typeof post.timestamp !== 'string' ||
    !TOPIC_IDS.has(post.topic)
  ) {
    return null
  }

  return {
    id: post.id,
    text: post.text.slice(0, MAX_POST_LENGTH),
    topic: post.topic,
    cheers:
      Number.isInteger(post.cheers) && post.cheers >= 0 ? post.cheers : 0,
    replies: Array.isArray(post.replies)
      ? post.replies.map(cleanReply).filter(Boolean)
      : [],
    timestamp: post.timestamp,
    isExample: post.isExample === true,
  }
}

// Returns { posts, cheeredIds }. Example posts are added the first
// time only; if the user later deletes everything, they stay deleted.
export function loadCommunity() {
  try {
    const stored = window.localStorage.getItem(COMMUNITY_KEY)

    if (!stored) {
      return { posts: seedPosts(), cheeredIds: [] }
    }

    const parsed = JSON.parse(stored)
    const posts = Array.isArray(parsed?.posts)
      ? parsed.posts.map(cleanPost).filter(Boolean)
      : []
    const postIds = new Set(posts.map(post => post.id))
    const cheeredIds = Array.isArray(parsed?.cheeredIds)
      ? parsed.cheeredIds.filter(id => postIds.has(id))
      : []

    return {
      posts: posts.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      cheeredIds,
    }
  } catch (error) {
    console.error('Could not load MotherLoop community posts:', error)
    return { posts: [], cheeredIds: [] }
  }
}

export function saveCommunity({ posts, cheeredIds }) {
  try {
    window.localStorage.setItem(
      COMMUNITY_KEY,
      JSON.stringify({
        posts: posts.slice(0, MAX_POSTS),
        cheeredIds,
      })
    )
    return true
  } catch (error) {
    console.error('Could not save MotherLoop community posts:', error)
    return false
  }
}
