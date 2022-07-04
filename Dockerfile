FROM node:alpine AS builder
WORKDIR /usr/src/
COPY package*.json ./
RUN ["npm", "install"]
RUN ["npm", "install", "typescript"]
COPY src/ ./
RUN ["npx", "tsc"]

FROM node:alpine
WORKDIR /usr/src/cdn-test-server
EXPOSE 80 443
COPY package*.json ./
RUN apk add openssl && npm install
COPY ./dist/entrypoint.sh ./entrypoint.sh
RUN [ "chmod", "+x", "/usr/src/cdn-test-server/entrypoint.sh" ]
COPY --from=builder /usr/src/dist ./dist
COPY ./dist ./dist
ENV EXPIRED_DAYS=825
ENTRYPOINT [ "/usr/src/cdn-test-server/entrypoint.sh" ]
CMD ["www.example.com"]
