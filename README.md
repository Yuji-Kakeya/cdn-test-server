docker build -t cdn-test-server .   
docker run -d -p 80:80 -p 443:443 -e EXPIRED_DAYS=825 cdn-test-server www.example.com
