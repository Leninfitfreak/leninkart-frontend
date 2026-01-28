# Stage 1: Build React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --silent
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx config to proxy API calls
RUN echo 'server { \n\
    listen 80; \n\
    location / { \n\
        root /usr/share/nginx/html; \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    location /api/ { \n\
        proxy_pass http://leninkart-product-service.dev.svc.cluster.local:8081; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Host $host; \n\
    } \n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
