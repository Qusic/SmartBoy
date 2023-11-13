FROM node:alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache --upgrade ffmpeg \
 && corepack enable && corepack install --global pnpm@latest && pnpm install --frozen-lockfile --prod
COPY . .
WORKDIR /data
CMD ["node", "/app"]
