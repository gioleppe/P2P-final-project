FROM node:alpine
WORKDIR /valadilene
COPY ./ /valadilene
RUN npm install 
RUN npm install truffle -g
CMD truffle test