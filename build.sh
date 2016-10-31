#!/bin/bash

source .env

browserify --entry client.js > static/-.js
stylus --compress < style.styl > static/-.css
jade --no-debug -O '{"url":"'"$URL"'", "static_url":"'"$STATIC_URL"'", "version": "'"$VER"'"}' < index.jade > static/index.html

