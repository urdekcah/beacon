#!/bin/sh
echo "Waiting for database to be ready..."
while ! nc -z db 3306; do
  echo "Waiting for the database to start..."
  sleep 2
done

echo "Running database initialization script..."
if [ ! -f /usr/src/app/.db_initialized ]; then
  python3 /usr/src/app/scripts/db.py --no-confirm
  INIT_EXIT_CODE=$?
  if [ $INIT_EXIT_CODE -ne 0 ]; then
    echo "Database initialization failed. Exiting."
    exit $INIT_EXIT_CODE
  fi
  touch /usr/src/app/.db_initialized
fi

echo "Starting Node.js application..."
exec npm start
