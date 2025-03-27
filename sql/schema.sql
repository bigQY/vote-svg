-- 初始化数据库结构
-- 0. 删除旧表
DROP TABLE IF EXISTS Options;
DROP TABLE IF EXISTS Topics;
DROP TABLE IF EXISTS IpVotes;

-- 1. 创建topic表
CREATE TABLE Topics (
    TopicID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title VARCHAR(1024) NOT NULL,
    Description TEXT,
    OptionsCount INTEGER NOT NULL
);
-- 2. 创建option表
CREATE TABLE Options (
    OptionID INTEGER PRIMARY KEY AUTOINCREMENT,
    TopicID INTEGER,
    OptionText VARCHAR(1024) NOT NULL,
    Votes INTEGER NOT NULL,
    FOREIGN KEY (TopicID) REFERENCES Topics(TopicID) ON DELETE CASCADE
);

-- 3. 创建ipvotes表
CREATE TABLE IpVotes (
    IpAddress VARCHAR(15),
    TopicID INTEGER,
    LastVoteTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fingerprint TEXT,
    FOREIGN KEY (TopicID) REFERENCES Topics(TopicID) ON DELETE CASCADE
);
-- 4. 创建索引
-- 针对IP+主题的快速查询
CREATE INDEX idx_ip_topic ON IpVotes (IpAddress, TopicID);

-- 针对指纹+主题的快速查询 
CREATE INDEX idx_fingerprint_topic ON IpVotes (Fingerprint, TopicID);

-- 时间范围查询优化
CREATE INDEX idx_vote_time ON IpVotes (LastVoteTime);


