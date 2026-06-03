#!/bin/sh
set -eu 

./node_modules/.bin/prisma migrate deploy

set +e
exec node dist/src/main.js