#!/bin/bash

# Automated Supabase Backup Script
# Run this daily via cron to prevent data loss

# Configuration
SUPABASE_DB_URL="your_supabase_connection_string_here"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_FILE"
pg_dump "$SUPABASE_DB_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"

# To set up cron job, run:
# crontab -e
# Add this line to run daily at 2 AM:
# 0 2 * * * /path/to/this/script.sh
