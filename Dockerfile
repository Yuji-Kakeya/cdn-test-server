FROM node:17-alpine3.12 AS builder
WORKDIR /usr/src/
COPY *.json ./
RUN ["npm", "install"]
RUN ["npm", "install", "typescript"]
COPY ./dev ./
RUN ["npx", "tsc"]


FROM node:17-alpine3.12
WORKDIR /usr/src/cdn-test-server
EXPOSE 80 443
ENV FQDN "www.example.com"
COPY *.json ./
RUN ["npm", "install"]
COPY ./start.sh ./start.sh
RUN [ "chmod", "+x", "./start.sh" ]
RUN apk add openssl && npm install
COPY --from=builder /usr/src/dist ./dist
COPY ./dist ./dist
ENTRYPOINT [ "./start.sh" ]
CMD []
