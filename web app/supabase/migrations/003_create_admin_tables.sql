-- ==============================================
-- Create admins table to track site administrators
-- ==============================================
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'admin' -- 'admin' or 'superadmin'
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admins table
CREATE POLICY "Admins can read admin list" ON public.admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );

-- Only superadmins can insert/delete admins
CREATE POLICY "Superadmins can manage admins" ON public.admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid() AND a.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete admins" ON public.admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid() AND a.role = 'superadmin'
    )
  );

-- ==============================================
-- Optional helper: Admin-only view of users with attempt stats
-- ==============================================
CREATE OR REPLACE VIEW public.admin_user_stats AS
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(u.user_metadata->>'first_name', split_part(u.email, '@', 1)) AS first_name,
  COALESCE(u.user_metadata->>'last_name', '') AS last_name,
  u.created_at AS joined_at,
  EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id) AS is_admin,
  COALESCE(a.role, '') AS admin_role,
  COUNT(qa.id) AS total_quiz_attempts,
  COALESCE(MAX(qa.score), 0) AS best_score,
  COALESCE(MAX(qa.percentage), 0) AS best_percentage,
  COALESCE(SUM(qa.correct_count), 0) AS total_correct,
  COALESCE(SUM(qa.total_questions), 0) AS total_questions_answered,
  COUNT(DISTINCT f.id) AS total_favorites
FROM auth.users u
LEFT JOIN public.quiz_attempts qa ON u.id = qa.user_id
LEFT JOIN public.favorites f ON u.id = f.user_id
LEFT JOIN public.admins a ON u.id = a.user_id
GROUP BY u.id, u.email, u.user_metadata, a.role;

GRANT SELECT ON public.admin_user_stats TO authenticated;
