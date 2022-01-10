FROM node:17-alpine3.12
WORKDIR /usr/src/app
ENV FQDN "www.example.com"
COPY ./package*.json ./
COPY ./entrypoint.sh ./
RUN apk add openssl && npm install
COPY ./dist ./dist
EXPOSE 80 443
RUN [ "chmod", "+x", "./entrypoint.sh" ]
ENTRYPOINT [ "./entrypoint.sh" ]
CMD []
