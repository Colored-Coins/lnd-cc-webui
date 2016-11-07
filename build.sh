#!/bin/bash

source .env

PATH=./node_modules/.bin:$PATH

browserify --entry client.js | uglifyjs --mangle --compress warnings=false > static/-.js
stylus --compress < style.styl > static/-.css
jade --no-debug -O '{"url":"'"$URL"'", "static_url":"'"$STATIC_URL"'", "version": "'"$VER"'", "settings":{"env":"'"$NODE_ENV"'"}}' < index.jade > static/index.html

