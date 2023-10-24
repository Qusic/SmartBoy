FROM node:alpine
RUN corepack enable && corepack install --global pnpm@latest
RUN apk add --no-cache --upgrade ffmpeg
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY . .
WORKDIR /data
CMD ["node", "/app"]
