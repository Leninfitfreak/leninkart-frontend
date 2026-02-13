# Stage 1: Build React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --silent --no-audit --no-fund
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
