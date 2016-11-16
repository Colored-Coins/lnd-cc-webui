#!/bin/bash

source .env
PATH=./node_modules/.bin:$PATH

locals='{"url":"'"$URL"'", "static_url":"'"$STATIC_URL"'", "version": "'"$VER"'", "settings":{"env":"'"$NODE_ENV"'"}}'

echo "[concat] lib.js ..."
(cat static/bootstrap/js/bootstrap.mini.js; echo ';'; cat node_modules/bootstrap-notify/bootstrap-notify.min.js) > static/lib.js

echo "[browserify] client.js ..."
browserify --entry client.js | uglifyjs --mangle --compress warnings=false > static/-.js

echo "[stylus] style.styl ..."
stylus --compress < style.styl > static/-.css

echo "[jade] index.jade, faq.jade ..."
jade --no-debug -O "$locals" -o static pages/{index,faq}.jade

