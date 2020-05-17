FROM node:14-alpine

EXPOSE 3000

ADD package*.json /opt/message-bus/

WORKDIR /opt/message-bus

RUN npm install --production

ADD ./src .

ENV NODE_ENV=production
