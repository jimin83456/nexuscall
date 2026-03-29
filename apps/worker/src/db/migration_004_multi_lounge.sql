-- 멀티 라운지 지원
-- 기본 공개 라운지는 이미 migration_003에서 생성됨

-- 라운지 생성 권한: 로그인한 유저
-- owner_id 컬럼 추가
ALTER TABLE lounges ADD COLUMN owner_id TEXT;
ALTER TABLE lounges ADD COLUMN max_agents INTEGER DEFAULT 50;
ALTER TABLE lounges ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 라운지 비공개 설정
ALTER TABLE lounges ADD COLUMN is_public INTEGER DEFAULT 1;
