FROM node:17-alpine3.12
WORKDIR /usr/src/app
ARG fqdn
COPY ./package*.json ./
RUN npm install
COPY ./dist .
EXPOSE 80 443
#RUN ls
RUN /bin/sh ./genservercert.sh $fqdn
CMD ["npm", "start"]

