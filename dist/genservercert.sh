#!/bin/bash

#CONST
PASSWORD=1234
C=JP
ST=example
L=example
O=example

echo "subjectAltName=DNS:$1" > ./cert/_san.conf
openssl genrsa -passout pass:${PASSWORD} -aes256 -out ./cert/_server.key 2048
openssl rsa -passin pass:${PASSWORD} -in ./cert/_server.key -out ./cert/server.key
openssl req -new -key ./cert/server.key -out ./cert/_request.csr -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=$1"
openssl ca -batch -in ./cert/_request.csr -out ./cert/server.crt -days 825 -config ./cert/RootCA/conf.cnf -extfile ./cert/_san.conf 
rm -rf _*.*

