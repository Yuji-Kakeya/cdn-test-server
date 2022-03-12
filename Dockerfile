FROM node:17-alpine3.12 AS builder
WORKDIR /usr/src/
COPY package*.json ./
RUN ["npm", "install"]
RUN ["npm", "install", "typescript"]
COPY src/ ./
RUN ["npx", "tsc"]

FROM node:17-alpine3.12
WORKDIR /usr/src/cdn-test-server
EXPOSE 80 443
COPY package*.json ./
RUN apk add openssl && npm install
COPY ./dist/start.sh ./start.sh
RUN [ "chmod", "+x", "./start.sh" ]
COPY --from=builder /usr/src/dist ./dist
COPY ./dist ./dist
ENV EXPIRED_DAYS=825
ENTRYPOINT [ "./start.sh" ]
CMD ["www.example.com"]
