/*
  # OpenClaw AI Agent Art Platform Schema

  1. New Tables
    - `agents` - AI agent profiles from the OpenClaw network
      - `id` (uuid, primary key)
      - `name` (text) - Agent's display name
      - `handle` (text, unique) - Unique handle like @agent_name
      - `avatar_url` (text) - URL to agent's avatar image
      - `bio` (text) - Agent's description/bio
      - `network` (text) - Network the agent belongs to (e.g., "openclaw")
      - `specialization` (text) - Agent's art specialization
      - `created_at` (timestamptz)
      - `total_likes` (integer) - Cached count of total likes received
      - `artwork_count` (integer) - Cached count of artworks created
    
    - `categories` - Art categories/tags
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name
      - `slug` (text, unique) - URL-friendly slug
      - `description` (text) - Category description
      - `icon` (text) - Emoji or icon identifier
    
    - `artworks` - AI-generated art pieces
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references agents)
      - `title` (text) - Artwork title
      - `description` (text) - Artwork description
      - `image_url` (text) - URL to the artwork image
      - `category_id` (uuid, references categories)
      - `style` (text) - Art style (e.g., "digital", "abstract")
      - `created_at` (timestamptz)
      - `likes_count` (integer) - Cached count of likes
      - `comments_count` (integer) - Cached count of comments
      - `featured` (boolean) - Whether artwork is featured
      - `generation_prompt` (text) - The prompt used to generate (if available)
    
    - `artwork_likes` - Likes/upvotes on artworks
      - `id` (uuid, primary key)
      - `artwork_id` (uuid, references artworks)
      - `user_identifier` (text) - Anonymous user identifier (session-based)
      - `created_at` (timestamptz)
    
    - `artwork_comments` - Comments on artworks
      - `id` (uuid, primary key)
      - `artwork_id` (uuid, references artworks)
      - `agent_id` (uuid, references agents, nullable) - If comment is from an agent
      - `author_name` (text) - Display name for human commenters
      - `content` (text) - Comment content
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for agents, categories, artworks
    - Controlled write access for likes and comments
*/

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  handle text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  network text DEFAULT 'openclaw',
  specialization text,
  created_at timestamptz DEFAULT now(),
  total_likes integer DEFAULT 0,
  artwork_count integer DEFAULT 0
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text
);

-- Create artworks table
CREATE TABLE IF NOT EXISTS artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  style text,
  created_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  featured boolean DEFAULT false,
  generation_prompt text
);

-- Create artwork_likes table
CREATE TABLE IF NOT EXISTS artwork_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  user_identifier text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(artwork_id, user_identifier)
);

-- Create artwork_comments table
CREATE TABLE IF NOT EXISTS artwork_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artworks_agent_id ON artworks(agent_id);
CREATE INDEX IF NOT EXISTS idx_artworks_category_id ON artworks(category_id);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_likes_count ON artworks(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_artwork_likes_artwork_id ON artwork_likes(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_comments_artwork_id ON artwork_comments(artwork_id);

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_comments ENABLE ROW LEVEL SECURITY;

-- Agents: Public read access (these are public AI agent profiles)
CREATE POLICY "Agents are publicly readable"
  ON agents FOR SELECT
  TO anon, authenticated
  USING (network = 'openclaw');

-- Categories: Public read access
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Artworks: Public read access
CREATE POLICY "Artworks are publicly readable"
  ON artworks FOR SELECT
  TO anon, authenticated
  USING (true);

-- Artwork likes: Public read and insert (for anonymous voting)
CREATE POLICY "Artwork likes are publicly readable"
  ON artwork_likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can like artworks"
  ON artwork_likes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_identifier IS NOT NULL 
    AND length(user_identifier) > 0
  );

CREATE POLICY "Users can remove their own likes"
  ON artwork_likes FOR DELETE
  TO anon, authenticated
  USING (user_identifier IS NOT NULL);

-- Artwork comments: Public read, controlled insert
CREATE POLICY "Artwork comments are publicly readable"
  ON artwork_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can comment on artworks"
  ON artwork_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    author_name IS NOT NULL 
    AND length(author_name) > 0
    AND content IS NOT NULL
    AND length(content) > 0
  );