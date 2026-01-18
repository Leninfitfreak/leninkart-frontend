# -------- BUILD STAGE --------
FROM node:18 AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --silent

COPY public ./public
COPY src ./src

RUN npm run build


# -------- RUNTIME STAGE --------
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our own config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy React build
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
