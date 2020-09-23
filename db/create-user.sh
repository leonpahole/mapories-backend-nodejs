#!/bin/bash
set -Eeuo pipefail

"${mongo[@]}" -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase "$rootAuthDatabase" "$MONGO_INITDB_DATABASE" <<-EOJS
    db.createUser({
        user: $(_js_escape "$DB_USER"),
        pwd: $(_js_escape "$DB_PASSWORD"),
        roles: [ { role: 'readWrite', db: $(_js_escape "$MONGO_INITDB_DATABASE") } ]
    })
EOJS