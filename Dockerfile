# Use Node.js as base image
FROM node:18-alpine

# Install python3 for npm build dependencies
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]