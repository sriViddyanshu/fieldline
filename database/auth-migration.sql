USE fieldline;

CREATE TABLE IF NOT EXISTS fieldline_auth_config (
  id TINYINT UNSIGNED PRIMARY KEY,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO fieldline_auth_config (id, setup_complete)
VALUES (1, FALSE)
ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS fieldline_users (
  id CHAR(36) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'administrator',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY fieldline_users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fieldline_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fieldline_sessions_expiry_idx (expires_at),
  CONSTRAINT fieldline_sessions_user_fk FOREIGN KEY (user_id)
    REFERENCES fieldline_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT
  DATABASE() AS selected_database,
  @@hostname AS server_host,
  @@port AS server_port,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN (
        'fieldline_auth_config',
        'fieldline_users',
        'fieldline_sessions'
      )
  ) AS auth_tables_created;
