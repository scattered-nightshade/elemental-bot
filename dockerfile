FROM node:latest

WORKDIR /app/

COPY package*.json ./

RUN npm install

COPY . .

ENV DISCORD_BOT_TOKEN=''
ENV MONGODB_URI=''

CMD ["npm", "start"]