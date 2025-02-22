#!/bin/bash

cd ..

# Create the tmp directory in the root of the project
mkdir -p tmp

# Download the JSON file to the tmp directory
curl -o tmp/finished.json https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json

echo "Downloaded, using quicktype to generate typing..."

# Use quicktype to generate TypeScript definitions from the JSON file
npx quicktype -l ts -s json tmp/finished.json > tmp/github-layer.type.ts

echo "Please review TS file and update SquadTS source code, in Webstorm select both file and press ctrl+D to diff."
