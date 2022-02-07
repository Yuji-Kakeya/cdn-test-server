#!/bin/sh
PASSWORD=1234
C=JP
ST=example
L=example
O=example

echo "subjectAltName=DNS:$1" > ./dist/cert/_san.conf
openssl genrsa -passout pass:${PASSWORD} -aes256 -out ./dist/cert/_server.key 2048
openssl rsa -passin pass:${PASSWORD} -in ./dist/cert/_server.key -out ./dist/cert/server.key
openssl req -new -key ./dist/cert/server.key -out ./dist/cert/_request.csr -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=$1"
openssl ca -batch -in ./dist/cert/_request.csr -out ./dist/cert/server.crt -days ${EXPIRED_DAYS} -config ./dist/cert/RootCA/conf.cnf -extfile ./dist/cert/_san.conf 
rm -rf _*.*

npm start