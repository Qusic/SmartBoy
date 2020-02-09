FROM node:alpine
WORKDIR /app
COPY package.json .
RUN npm install --production && npm audit fix
COPY index.js .
CMD ["node", "."]
