-- DockMind Seed Data
-- Run AFTER schema.sql

-- Demo user (password: demo1234)
-- bcrypt hash of "demo1234"
INSERT INTO users (name, email, hashed_password, role)
VALUES (
    'Demo User',
    'demo@dockmind.dev',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN3hHjyL38bFRbDk7RyHa',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Sample saved prompts
INSERT INTO saved_prompts (user_id, title, content)
SELECT id, 'Restart Nginx', 'Restart the nginx container'
FROM users WHERE email = 'demo@dockmind.dev'
ON CONFLICT DO NOTHING;

INSERT INTO saved_prompts (user_id, title, content)
SELECT id, 'Show Running Containers', 'List all running containers'
FROM users WHERE email = 'demo@dockmind.dev'
ON CONFLICT DO NOTHING;

INSERT INTO saved_prompts (user_id, title, content)
SELECT id, 'Stop Redis', 'Stop the redis container'
FROM users WHERE email = 'demo@dockmind.dev'
ON CONFLICT DO NOTHING;
