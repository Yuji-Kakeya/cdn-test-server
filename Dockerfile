FROM node:17-alpine3.12

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY ./dist .

EXPOSE 80 443

CMD ["npm", "start"]