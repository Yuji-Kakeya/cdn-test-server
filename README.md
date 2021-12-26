docker build -t cdn-test-server --build-arg fqdn=www.example.com .
docker run --name cdn-test-server -itd -p 80:80 -p 443:443 cdn-test-server