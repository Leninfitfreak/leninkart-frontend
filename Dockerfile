FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install --silent
COPY public ./public
COPY src ./src
EXPOSE 3000
ENV PORT=3000
CMD ["npm","start","--","--host","0.0.0.0"]
