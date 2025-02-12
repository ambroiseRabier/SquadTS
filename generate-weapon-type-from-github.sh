#!/bin/bash

# Create the tmp directory in the root of the project
mkdir -p tmp

# Download the JSON file to the tmp directory
curl -o tmp/weaponInfo.json https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-weapon-and-vehicle-data/refs/heads/main/data/_currentVersion/weaponInfo.json

echo "Downloaded, using quicktype to generate typing..."

# Use quicktype to generate TypeScript definitions from the JSON file
npx quicktype -l ts -s json tmp/weaponInfo.json > tmp/github-weapon.type.ts

echo "Please review TS file and update SquadTS source code, in Webstorm select both file and press ctrl+D to diff."
