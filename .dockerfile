FROM node:lts-alpine

WORKDIR /app

# Stops if any required Env var is missing.
RUN bash -c 'if [ -z "$ZIP_URL" ] || [ -z "$SQUAD_TS_CONFIG_PATH" ]; then echo "Error: ZIP_URL or SQUAD_TS_CONFIG_PATH is missing!" >&2; exit 1; fi'

# Download URL (that should be github zip), example:
# - release candidate: 'https://github.com/AmbroiseRabier/SquadTS/archive/refs/heads/main.zip'
# - release v1.0.0: 'https://github.com/AmbroiseRabier/SquadTS/archive/refs/tags/v1.0.0.zip'
#
# To avoid having to deal with different release/branch names, name the zip SquadTS.zip
# Unzip and delete zip.
RUN wget -O SquadTS.zip ${ZIP_URL} && unzip SquadTS.zip && rm -f SquadTS.zip

# Rename first folder (whatever it name is) to SquadTS
# We do this because git send us a folder that is named based on branch/tag.
RUN folder_name=$(ls -d */ | head -n 1) && mv "$folder_name" SquadTS

WORKDIR /app/SquadTS

# Copy base config inside custom config folder, only if dir is empty.
RUN bash -c '[ "$(ls -A "$SQUAD_TS_CONFIG_PATH")" ] || cp -r /app/SquadTS/config/* "$SQUAD_TS_CONFIG_PATH"'

# Install dependencies
RUN npm ci

CMD [ "npm", "run", "start" ]
