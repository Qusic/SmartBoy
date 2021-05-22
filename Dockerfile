FROM node:alpine
RUN apk add --no-cache curl ffmpeg
WORKDIR /app
COPY . .
RUN npm install --production
WORKDIR /data
CMD ["node", "/app"]
