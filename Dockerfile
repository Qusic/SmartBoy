FROM node:alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev \
 && chown -R $(id -u):$(id -g) node_modules # workaround for https://github.com/npm/cli/issues/5900
COPY lib lib
WORKDIR /data
CMD ["node", "/app"]
