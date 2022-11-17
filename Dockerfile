FROM node:alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY lib lib
WORKDIR /data
CMD ["node", "/app"]
