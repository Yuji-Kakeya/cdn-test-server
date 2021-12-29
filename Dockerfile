FROM node:17-alpine3.12
WORKDIR /usr/src/app
ENV FQDN www.example.com
COPY ./package*.json ./
RUN npm install
COPY ./dist .
RUN apk add openssl
EXPOSE 80 443
ENTRYPOINT ["./start.sh"]
CMD []