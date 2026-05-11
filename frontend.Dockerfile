FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Docker mein backend ka naam 'backend' hoga, localhost nahi
ENV REACT_APP_API_URL=http://localhost:8000

CMD ["npm", "start"]
