const express = require("express");
const path = require("path");
const server = express();
const port = process.env.PORT || 5001;

// Configuração do CORS
const corsConfigs = require("./server/configs/cors");

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(corsConfigs);
server.use(express.static('./'));

const svCont1 = require("./server/middleware/controller.v2.clear.prods");
const svCont2 = require("./server/middleware/controller.v2.loadtables");
const svCont3 = require("./server/middleware/controller.v2.specifications");
const svCont4 = require("./server/middleware/controller.v2.orders");

server.use('/', svCont1);
server.use('/', svCont2);
server.use('/', svCont3);
server.use('/', svCont4);

// Teste
server.listen(port, () => console.log(`Server running in http://localhost:${port}`));