-- ==============================================
-- Create quiz attempts table for tracking progress
-- ==============================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'all',
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  lifelines_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- Create quiz leaderboard view (top scores)
-- ==============================================
CREATE OR REPLACE VIEW public.quiz_leaderboard AS
SELECT
  u.id AS user_id,
  COALESCE(u.user_metadata->>'first_name', split_part(u.email, '@', 1)) AS first_name,
  COALESCE(u.user_metadata->>'last_name', '') AS last_name,
  MAX(qa.score) AS best_score,
  MAX(qa.percentage) AS best_percentage,
  COUNT(qa.id) AS total_attempts,
  MAX(qa.created_at) AS last_played_at
FROM public.quiz_attempts qa
JOIN auth.users u ON qa.user_id = u.id
GROUP BY u.id, u.email, u.user_metadata
ORDER BY best_score DESC;

-- Grant access to the leaderboard view
GRANT SELECT ON public.quiz_leaderboard TO anon, authenticated;
