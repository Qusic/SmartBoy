FROM node:alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY lib lib
WORKDIR /data
CMD ["node", "/app"]
