#!/bin/bash

# Create dist directory
mkdir -p dist

# Copy HTML files
cp *.html dist/

# Copy and minify CSS
mkdir -p dist/css
for file in css/*.css; do
    cleancss -o dist/$file $file
done

# Copy and minify JS
mkdir -p dist/js
for file in js/*.js; do
    uglifyjs $file -o dist/$file -c -m
done

# Copy other assets
cp -r components dist/
cp -r images dist/ 2>/dev/null || :

# Create production config
echo "const config={MAPBOX_TOKEN:'your_production_token'};" > dist/js/config.js
