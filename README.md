docker build -t cdn-test-server .
docker run --rm -it -p 80:80 -p 443:443 -e FQDN=www.example.com cdn-test-server