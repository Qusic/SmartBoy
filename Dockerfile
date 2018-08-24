FROM node:alpine

WORKDIR /app
COPY package.json lib ./
RUN npm install --production && npm audit fix

CMD ["node", "."]
